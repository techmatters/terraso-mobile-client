/*
 * Copyright © 2023-2024 Technology Matters
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

import {renderHook} from '@testing-library/react-native';

import {SoilMatch} from 'terraso-client-shared/graphqlSchema/graphql';

import * as SoilIdMatchContext from 'terraso-mobile-client/context/SoilIdMatchContext';
import {
  SoilIdLocationInput,
  useSoilIdOutput,
} from 'terraso-mobile-client/hooks/soilIdHooks';
import * as soilIdMatchHooks from 'terraso-mobile-client/model/soilIdMatch/soilIdMatchHooks';

jest.mock('terraso-mobile-client/context/SoilIdMatchContext', () => {
  return {
    useActiveSoilIdData: jest.fn(),
  };
});

jest.mock('terraso-mobile-client/model/soilIdMatch/soilIdMatchHooks', () => {
  return {
    useTempLocationMatches: jest.fn(),
    useSiteMatches: jest.fn(),
  };
});

const renderSoilIdHook = (input: SoilIdLocationInput) => {
  return renderHook((props: SoilIdLocationInput) => useSoilIdOutput(props), {
    initialProps: input,
  });
};

const dataBasedMatchWithName = (name: string): SoilMatch => {
  return {
    ...locationBasedMatchWithName(name),
    combinedMatch: {
      rank: 0,
      score: 0,
    },
    dataMatch: {
      rank: 0,
      score: 0,
    },
    locationMatch: {
      rank: 0,
      score: 0,
    },
  };
};

const locationBasedMatchWithName = (name: string): SoilMatch => {
  return {
    soilInfo: {
      landCapabilityClass: {capabilityClass: '', subClass: ''},
      soilData: {depthDependentData: []},
      soilSeries: {
        name: name,
        description: '',
        fullDescriptionUrl: '',
        taxonomySubgroup: '',
      },
    },
    distanceToNearestMapUnitM: 0,
    locationMatch: {
      rank: 0,
      score: 0,
    },
    dataSource: '',
  };
};

describe('useValueSet', () => {
  const useTempLocationMatches = jest.mocked(
    soilIdMatchHooks.useTempLocationMatches,
  );
  const useSiteMatches = jest.mocked(soilIdMatchHooks.useSiteMatches);
  const useActiveSoilIdData = jest.mocked(
    SoilIdMatchContext.useActiveSoilIdData,
  );
  const addSite = jest.fn();
  const removeSite = jest.fn();
  const addCoords = jest.fn();
  const removeCoords = jest.fn();

  beforeEach(() => {
    useTempLocationMatches.mockReset();
    useSiteMatches.mockReset();

    useActiveSoilIdData.mockReset();
    useActiveSoilIdData.mockReturnValue({addSite, addCoords});
    addSite.mockReset();
    addSite.mockReturnValue({remove: removeSite});
    addCoords.mockReset();
    addCoords.mockReturnValue({remove: removeCoords});
  });

  test('returns default empty state for location-based', async () => {
    const {result} = renderSoilIdHook({coords: {latitude: 1, longitude: 2}});

    expect(result.current.status).toEqual('loading');
    expect(result.current.matches).toEqual([]);
  });

  test('returns default empty state for data-based', async () => {
    const {result} = renderSoilIdHook({siteId: 'a'});

    expect(result.current.status).toEqual('loading');
    expect(result.current.matches).toEqual([]);
  });

  test('returns location-based matches', async () => {
    const coords = {latitude: 1, longitude: 2};
    useTempLocationMatches.mockReturnValue({
      dataRegion: 'GLOBAL',
      input: coords,
      matches: [locationBasedMatchWithName('a')],
      status: 'ready',
    });

    const {result} = renderSoilIdHook({coords});

    expect(result.current.dataRegion).toEqual('GLOBAL');
    expect(result.current.status).toEqual('ready');
    expect(result.current.matches).toEqual([locationBasedMatchWithName('a')]);
  });

  test('returns data-based matches', async () => {
    useSiteMatches.mockReturnValue({
      dataRegion: 'US',
      input: 'who cares' as any,
      matches: [dataBasedMatchWithName('a')],
      status: 'ready',
    });

    const {result} = renderSoilIdHook({siteId: 'abc'});

    expect(result.current.dataRegion).toEqual('US');
    expect(result.current.status).toEqual('ready');
    expect(result.current.matches).toEqual([dataBasedMatchWithName('a')]);
  });

  test('adds coords to active soil id data', async () => {
    const coords = {latitude: 1, longitude: 2};
    renderSoilIdHook({coords});

    expect(addCoords).toHaveBeenCalledWith(coords);
    expect(addSite).not.toHaveBeenCalled();
  });

  test('adds site to active soil id data', async () => {
    renderSoilIdHook({siteId: 'abc'});

    expect(addSite).toHaveBeenCalledWith('abc');
    expect(addCoords).not.toHaveBeenCalled();
  });

  it('removes site from active soil id data when input changes', async () => {
    const {rerender} = renderSoilIdHook({siteId: 'abc'});
    rerender({siteId: 'def'});

    expect(removeSite).toHaveBeenCalled();
    expect(addSite).toHaveBeenCalledWith('def');
  });

  it('removes coords from active soil id data when input changes', async () => {
    const {rerender} = renderSoilIdHook({coords: {latitude: 1, longitude: 2}});
    rerender({coords: {latitude: 2, longitude: 3}});

    expect(removeCoords).toHaveBeenCalled();
    expect(addCoords).toHaveBeenCalledWith({latitude: 2, longitude: 3});
  });
});
