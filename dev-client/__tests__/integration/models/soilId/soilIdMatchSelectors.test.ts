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

import {
  createProjectSettings,
  generateProject,
  generateSite,
  generateSiteInterval,
} from '@testing/integration/modelUtils';
import {renderSelectorHook} from '@testing/integration/utils';

import {initialState as accountInitialState} from 'terraso-client-shared/account/accountSlice';

import {DEFAULT_SOIL_DATA} from 'terraso-mobile-client/model/soilData/soilDataConstants';
import {SoilData} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {soilDataToIdInput} from 'terraso-mobile-client/model/soilIdMatch/actions/soilIdMatchInputs';
import {selectNextDataBasedInputs} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatchSelectors';
import {initialState as syncInitialState} from 'terraso-mobile-client/model/sync/syncSlice';
import {AppState, useSelector} from 'terraso-mobile-client/store';

const appState = (): AppState => {
  return {
    account: accountInitialState,
    map: {userLocation: {accuracyM: null, coords: null}},
    elevation: {elevationCache: {}},
    export: {token: null, isLoading: false, error: null},
    notifications: {messages: {}},
    preferences: {colorWorkflow: 'MANUAL'},
    project: {projects: {}},
    site: {sites: {}},
    soilData: {
      projectSettings: {},
      soilSync: {},
      soilData: {},
      status: 'ready',
    },
    soilIdMatch: {
      locationBasedMatches: {},
      siteDataBasedMatches: {},
    },
    soilMetadata: {
      soilMetadata: {},
    },
    sync: syncInitialState,
  };
};

describe('selectNextDataBasedInputs', () => {
  test('supplies default soil data for newly created sites', () => {
    const state = appState();
    const selected = renderSelectorHook(
      () => useSelector(s => selectNextDataBasedInputs(s, ['id'])),
      state,
    );
    expect(selected).toEqual({
      id: soilDataToIdInput(DEFAULT_SOIL_DATA),
    });
  });

  test('only includes data for custom site depths that are visible', () => {
    const baseAppState = appState();
    const site = generateSite();
    const soilData = {
      [site.id]: {
        depthIntervals: [
          generateSiteInterval({start: 1, end: 2}),
          generateSiteInterval({start: 3, end: 4}),
        ],
        depthDependentData: [
          generateSiteInterval({start: 1, end: 2}),
          generateSiteInterval({start: 5, end: 6}),
        ],
        depthIntervalPreset: 'CUSTOM',
      },
    } as Record<string, SoilData | undefined>;

    const state = {
      ...baseAppState,
      site: {sites: {[site.id]: site}},
      soilData: {
        ...baseAppState.soilData,
        soilData: soilData,
      },
    };
    const selected = renderSelectorHook(
      () => useSelector(s => selectNextDataBasedInputs(s, [site.id])),
      state,
    );
    expect(selected[site.id]).toBeTruthy();
    expect(selected[site.id]?.depthDependentData).toHaveLength(1);
    expect(selected[site.id]?.depthDependentData[0].depthInterval).toEqual({
      start: 1,
      end: 2,
    });
  });

  test('includes data at custom project depths', () => {
    const baseAppState = appState();

    const project = generateProject();
    const site = generateSite({project});

    const projectDepthIntervals = [
      {depthInterval: {start: 1, end: 2}, label: 'first'},
      {depthInterval: {start: 5, end: 6}, label: 'second'},
    ];

    const projectSettings = createProjectSettings(project, {
      depthIntervals: projectDepthIntervals,
      depthIntervalPreset: 'CUSTOM',
    });

    const siteDepthIntervals = [
      {depthInterval: {start: 1, end: 2}, label: 'first'},
      {depthInterval: {start: 3, end: 4}, label: 'second'},
    ];
    const soilData = {
      [site.id]: {
        depthIntervals: [],
        depthDependentData: siteDepthIntervals,
        // FYI sites in projects may have an inaccurate preset
        depthIntervalPreset: 'BLM',
      },
    } as Record<string, SoilData | undefined>;

    const state = {
      ...baseAppState,
      site: {sites: {[site.id]: site}},
      project: {projects: {[project.id]: project}},
      soilData: {
        ...baseAppState.soilData,
        projectSettings: projectSettings,
        soilData: soilData,
      },
    };
    const selected = renderSelectorHook(
      () => useSelector(s => selectNextDataBasedInputs(s, [site.id])),
      state,
    );
    expect(selected[site.id]).toBeTruthy();
    expect(selected[site.id]?.depthDependentData).toHaveLength(1);
    expect(selected[site.id]?.depthDependentData[0].depthInterval).toEqual({
      start: 1,
      end: 2,
    });
  });
});
