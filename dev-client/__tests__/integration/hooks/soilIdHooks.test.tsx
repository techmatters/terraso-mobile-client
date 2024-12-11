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

import {
  DataBasedSoilMatch,
  LocationBasedSoilMatch,
} from 'terraso-client-shared/graphqlSchema/graphql';
import {Coords} from 'terraso-client-shared/types';

import * as SoilIdMatchContext from 'terraso-mobile-client/context/soilIdMatchContext2';
import {useSoilIdData} from 'terraso-mobile-client/hooks/soilIdHooks';
import * as soilIdMatchHooks from 'terraso-mobile-client/model/soilIdMatch/soilIdMatchHooks';

jest.mock('terraso-mobile-client/context/SoilIdMatchContext', () => {
  return {
    useActiveSoilIdData: jest.fn(),
  };
});

jest.mock('terraso-mobile-client/model/soilIdMatch/soilIdMatchHooks', () => {
  return {
    useLocationBasedMatches: jest.fn(),
    useSiteDataBasedMatches: jest.fn(),
  };
});

const renderSoilIdHook = (initialCoords: Coords, initialSiteId?: string) => {
  return renderHook(
    (props: {coords: Coords; siteId?: string}) =>
      useSoilIdData(props.coords, props.siteId),
    {initialProps: {coords: initialCoords, siteId: initialSiteId}},
  );
};

const dataBasedMatchWithName = (name: string): DataBasedSoilMatch => {
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

const locationBasedMatchWithName = (name: string): LocationBasedSoilMatch => {
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
    match: {
      rank: 0,
      score: 0,
    },
    dataSource: '',
  };
};

describe('useValueSet', () => {
  const useLocationBasedMatches = jest.mocked(
    soilIdMatchHooks.useLocationBasedMatches,
  );
  const useSiteDataBasedMatches = jest.mocked(
    soilIdMatchHooks.useSiteDataBasedMatches,
  );
  const useActiveSoilIdData = jest.mocked(
    SoilIdMatchContext.useActiveSoilIdData,
  );
  const addSite = jest.fn();
  const removeSite = jest.fn();
  const addCoords = jest.fn();
  const removeCoords = jest.fn();

  beforeEach(() => {
    useLocationBasedMatches.mockReset();
    useSiteDataBasedMatches.mockReset();

    useActiveSoilIdData.mockReset();
    useActiveSoilIdData.mockReturnValue({addSite, addCoords});
    addSite.mockReset();
    addSite.mockReturnValue({remove: removeSite});
    addCoords.mockReset();
    addCoords.mockReturnValue({remove: removeCoords});
  });

  test('returns default empty state for location-based', async () => {
    const {result} = renderSoilIdHook({latitude: 1, longitude: 2});

    expect(result.current.status).toEqual('loading');
    expect(result.current.dataBasedMatches).toEqual([]);
    expect(result.current.locationBasedMatches).toEqual([]);
  });

  test('returns default empty state for data-based', async () => {
    const {result} = renderSoilIdHook({latitude: 1, longitude: 2}, 'a');

    expect(result.current.status).toEqual('loading');
    expect(result.current.dataBasedMatches).toEqual([]);
    expect(result.current.locationBasedMatches).toEqual([]);
  });

  test('returns location-based matches', async () => {
    const coords = {latitude: 1, longitude: 2};
    useLocationBasedMatches.mockReturnValue({
      input: coords,
      matches: [locationBasedMatchWithName('a')],
      status: 'ready',
    });

    const {result} = renderSoilIdHook(coords);

    expect(result.current.status).toEqual('ready');
    expect(result.current.dataBasedMatches).toEqual([]);
    expect(result.current.locationBasedMatches).toEqual([
      locationBasedMatchWithName('a'),
    ]);
  });

  test('returns data-based matches', async () => {
    useSiteDataBasedMatches.mockReturnValue({
      input: 'who cares' as any,
      matches: [dataBasedMatchWithName('a')],
      status: 'ready',
    });

    const {result} = renderSoilIdHook({latitude: 1, longitude: 2}, 'abc');

    expect(result.current.status).toEqual('ready');
    expect(result.current.dataBasedMatches).toEqual([
      dataBasedMatchWithName('a'),
    ]);
    expect(result.current.locationBasedMatches).toEqual([]);
  });

  test('adds coords to active soil id data', async () => {
    const coords = {latitude: 1, longitude: 2};
    renderSoilIdHook(coords);

    expect(addCoords).toHaveBeenCalledWith(coords);
    expect(addSite).not.toHaveBeenCalled();
  });

  test('adds site to active soil id data', async () => {
    renderSoilIdHook({latitude: 1, longitude: 2}, 'abc');

    expect(addSite).toHaveBeenCalledWith('abc');
    expect(addCoords).not.toHaveBeenCalled();
  });

  it('removes site from active soil id data when input changes', async () => {
    const {rerender} = renderSoilIdHook({latitude: 1, longitude: 2}, 'abc');
    rerender({coords: {latitude: 1, longitude: 2}, siteId: 'def'});

    expect(removeSite).toHaveBeenCalled();
    expect(addSite).toHaveBeenCalledWith('def');
  });

  it('removes coords from active soil id data when input changes', async () => {
    const {rerender} = renderSoilIdHook({latitude: 1, longitude: 2});
    rerender({coords: {latitude: 2, longitude: 3}, siteId: undefined});

    expect(removeCoords).toHaveBeenCalled();
    expect(addCoords).toHaveBeenCalledWith({latitude: 2, longitude: 3});
  });
});
