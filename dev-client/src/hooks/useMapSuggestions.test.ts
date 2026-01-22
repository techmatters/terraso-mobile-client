/*
 * Copyright © 2025 Technology Matters
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see https://www.gnu.org/licenses/.
 */

import {act, renderHook, waitFor} from '@testing-library/react-native';

import {Coords} from 'terraso-client-shared/types';

import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {useMapSuggestions} from 'terraso-mobile-client/hooks/useMapSuggestions';
import {MapboxSuggestion} from 'terraso-mobile-client/services/mapSearchService';

jest.mock('terraso-mobile-client/config', () => ({
  APP_CONFIG: {
    mapboxAccessToken: 'test-token',
  },
}));

jest.mock('terraso-mobile-client/hooks/connectivityHooks', () => ({
  useIsOffline: jest.fn(() => false),
}));

const mockFetch = jest.fn() as jest.Mock;
global.fetch = mockFetch;

type RawMapboxSuggestion = Omit<MapboxSuggestion, 'kind'>;

const mockSuggestionsResponse = (suggestions: RawMapboxSuggestion[]) => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({suggestions, attribution: 'Mapbox'}),
  });
};

const mockRetrieveResponse = (coordinates: Coords | undefined) => {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () =>
      Promise.resolve({
        features: coordinates ? [{properties: {coordinates}}] : [],
      }),
  });
};

const mockFetchError = () => {
  mockFetch.mockRejectedValueOnce(new Error('Network error'));
};

describe('useMapSuggestions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useIsOffline as jest.Mock).mockReturnValue(false);
  });

  describe('coordinate suggestions', () => {
    it('creates coordinate suggestion for valid lat,lng input', async () => {
      mockSuggestionsResponse([]);
      const {result} = renderHook(() => useMapSuggestions());

      await act(async () => {
        await result.current.querySuggestions('12.3, -45.6');
      });

      await waitFor(() => {
        expect(result.current.suggestions[0]).toEqual({
          kind: 'coords',
          name: '12.3, -45.6',
          coords: {latitude: 12.3, longitude: -45.6},
        });
      });
    });

    it('creates coordinate suggestion even when offline', async () => {
      (useIsOffline as jest.Mock).mockReturnValue(true);
      const {result} = renderHook(() => useMapSuggestions());

      await act(async () => {
        await result.current.querySuggestions('45, 90');
      });

      await waitFor(() => {
        expect(result.current.suggestions).toHaveLength(1);
        expect(result.current.suggestions[0]).toEqual({
          kind: 'coords',
          name: '45, 90',
          coords: {latitude: 45, longitude: 90},
        });
      });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('does not create coordinate suggestion for invalid input', async () => {
      mockSuggestionsResponse([]);
      const {result} = renderHook(() => useMapSuggestions());

      await act(async () => {
        await result.current.querySuggestions('not coordinates');
      });

      await waitFor(() => {
        expect(
          result.current.suggestions.filter(s => s.kind === 'coords'),
        ).toHaveLength(0);
      });
    });
  });

  describe('mapbox suggestions', () => {
    it('fetches mapbox suggestions when online and query is long enough', async () => {
      const rawSuggestion = {
        name: 'New York',
        mapbox_id: 'place.123',
        name_preferred: 'New York',
        feature_type: 'place',
        address: '',
        full_address: 'New York, NY, USA',
        place_formatted: 'NY, USA',
        distance: 100,
      };
      mockSuggestionsResponse([rawSuggestion]);

      const {result} = renderHook(() => useMapSuggestions());

      await act(async () => {
        await result.current.querySuggestions('New York');
      });

      await waitFor(() => {
        expect(result.current.suggestions).toContainEqual({
          ...rawSuggestion,
          kind: 'mapbox',
        });
      });
      expect(mockFetch).toHaveBeenCalled();
    });

    it('does not fetch mapbox suggestions when offline', async () => {
      (useIsOffline as jest.Mock).mockReturnValue(true);
      const {result} = renderHook(() => useMapSuggestions());

      await act(async () => {
        await result.current.querySuggestions('New York');
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.suggestions).toHaveLength(0);
    });

    it('does not fetch mapbox suggestions when query is too short', async () => {
      const {result} = renderHook(() => useMapSuggestions());

      await act(async () => {
        await result.current.querySuggestions('N');
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('throws fetch errors when no coordinate fallback exists', async () => {
      mockFetchError();
      const {result} = renderHook(() => useMapSuggestions());

      await expect(
        act(async () => {
          await result.current.querySuggestions('New York');
        }),
      ).rejects.toThrow('Network error');
    });

    it('still returns coordinate suggestion when fetch fails', async () => {
      mockFetchError();
      const {result} = renderHook(() => useMapSuggestions());

      await act(async () => {
        await result.current.querySuggestions('12.3, -45.6');
      });

      await waitFor(() => {
        expect(result.current.suggestions).toHaveLength(1);
        expect(result.current.suggestions[0]).toEqual({
          kind: 'coords',
          name: '12.3, -45.6',
          coords: {latitude: 12.3, longitude: -45.6},
        });
      });
    });

    it('clears suggestions when query becomes empty', async () => {
      const rawSuggestion: RawMapboxSuggestion = {
        name: 'New York',
        mapbox_id: 'place.123',
        name_preferred: 'New York',
        feature_type: 'place',
        address: '',
        full_address: 'New York, NY, USA',
        place_formatted: 'NY, USA',
        distance: 100,
      };
      mockSuggestionsResponse([rawSuggestion]);

      const {result} = renderHook(() => useMapSuggestions());

      await act(async () => {
        await result.current.querySuggestions('New York');
      });

      await waitFor(() => {
        expect(result.current.suggestions).toHaveLength(1);
      });

      await act(async () => {
        await result.current.querySuggestions('');
      });

      await waitFor(() => {
        expect(result.current.suggestions).toHaveLength(0);
      });
    });
  });

  describe('combined suggestions', () => {
    it('returns both coordinate and mapbox suggestions when input is valid coords', async () => {
      // Not sure this will ever actually happen; I've never seen mapbox return suggestions when there's a valid coordinate
      const rawMapboxSuggestion = {
        name: '12.5 Street',
        mapbox_id: 'address.456',
        name_preferred: '12.5 Street',
        feature_type: 'address',
        address: '12.5 Street',
        full_address: '12.5 Street, City',
        place_formatted: 'City',
        distance: 50,
      };
      mockSuggestionsResponse([rawMapboxSuggestion]);

      const {result} = renderHook(() => useMapSuggestions());

      await act(async () => {
        await result.current.querySuggestions('12.5, -45.3');
      });

      await waitFor(() => {
        expect(result.current.suggestions).toHaveLength(2);
        expect(result.current.suggestions[0]).toEqual({
          kind: 'coords',
          name: '12.5, -45.3',
          coords: {latitude: 12.5, longitude: -45.3},
        });
        expect(result.current.suggestions[1]).toEqual({
          ...rawMapboxSuggestion,
          kind: 'mapbox',
        });
      });
    });
  });

  describe('lookupFeature', () => {
    it('returns coordinates from feature lookup', async () => {
      const mockCoords = {latitude: 40.7128, longitude: -74.006};
      mockRetrieveResponse(mockCoords);

      const {result} = renderHook(() => useMapSuggestions());

      let coords;
      await act(async () => {
        coords = await result.current.lookupFeature('place.123');
      });

      expect(coords).toEqual(mockCoords);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('returns undefined when no features found', async () => {
      mockRetrieveResponse(undefined);

      const {result} = renderHook(() => useMapSuggestions());

      let coords;
      await act(async () => {
        coords = await result.current.lookupFeature('unknown.id');
      });

      expect(coords).toBeUndefined();
    });
  });
});
