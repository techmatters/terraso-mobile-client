/*
 * Copyright © 2024 Technology Matters
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
  SoilDataNode,
  SoilDataPushEntry,
  SoilDataPushFailureReason,
} from 'terraso-client-shared/graphqlSchema/graphql';

import {
  mutationResponseToResults,
  unsyncedDataToMutationInput,
  unsyncedDataToMutationInputEntry,
} from 'terraso-mobile-client/model/soilData/actions/remoteSoilDataActions';
import {SoilData} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {
  SyncRecord,
  SyncRecords,
} from 'terraso-mobile-client/model/sync/records';

describe('unsyncedDataToMutationInput', () => {
  let unsyncedChanges: SyncRecords<SoilData, SoilDataPushFailureReason>;
  let unsyncedData: Record<string, SoilData | undefined>;

  beforeEach(() => {
    unsyncedChanges = {};
    unsyncedData = {};
  });

  it('populates input with soil data entries', () => {
    unsyncedData = {
      a: {
        depthIntervalPreset: 'CUSTOM',
        depthIntervals: [],
        depthDependentData: [],
      },
      b: {
        depthIntervalPreset: 'CUSTOM',
        depthIntervals: [],
        depthDependentData: [],
      },
    };

    const input = unsyncedDataToMutationInput(unsyncedChanges, unsyncedData);
    expect(input.soilDataEntries).toHaveLength(2);
  });

  it('excludes entires that have no soil data', () => {
    unsyncedData = {
      a: {
        depthIntervalPreset: 'CUSTOM',
        depthIntervals: [],
        depthDependentData: [],
      },
      b: undefined,
    };

    const input = unsyncedDataToMutationInput(unsyncedChanges, unsyncedData);
    expect(input.soilDataEntries).toHaveLength(1);
  });
});

describe('unsyncedDataToMutationInputEntry', () => {
  let unsyncedChanges: SyncRecord<SoilData, SoilDataPushFailureReason>;
  let unsyncedData: SoilData;

  beforeEach(() => {
    unsyncedChanges = {};
    unsyncedData = {
      depthIntervalPreset: 'CUSTOM',
      depthIntervals: [],
      depthDependentData: [],
    };
  });

  it('populates input with site id', () => {
    const input = unsyncedDataToMutationInputEntry(
      'siteId',
      unsyncedChanges,
      unsyncedData,
    );
    expect(input.siteId).toEqual('siteId');
  });

  it('populates input with soil properties', () => {
    unsyncedData.bedrock = 1;
    unsyncedData.depthIntervals = [
      {
        label: 'test',
        depthInterval: {start: 1, end: 2},
      },
    ];
    unsyncedData.depthDependentData = [
      {
        depthInterval: {start: 1, end: 2},
      },
    ];

    const input = unsyncedDataToMutationInputEntry(
      'siteId',
      unsyncedChanges,
      unsyncedData,
    );
    expect(input.soilData.bedrock).toEqual(1);
    expect(input.soilData.depthIntervals).toEqual(unsyncedData.depthIntervals);
    expect(input.soilData.depthDependentData).toEqual(
      unsyncedData.depthDependentData,
    );
  });

  it('populates input with deleted depth intervals', () => {
    unsyncedData.depthIntervals = [
      {label: '', depthInterval: {start: 1, end: 2}},
    ];
    unsyncedChanges.lastSyncedData = {
      depthIntervalPreset: 'CUSTOM',
      depthIntervals: [{label: '', depthInterval: {start: 2, end: 3}}],
      depthDependentData: [],
    };

    const input = unsyncedDataToMutationInputEntry(
      'siteId',
      unsyncedChanges,
      unsyncedData,
    );
    expect(input.soilData.deletedDepthIntervals).toEqual([{start: 2, end: 3}]);
  });
});

describe('mutationResponseToResults', () => {
  let unsyncedChanges: SyncRecords<SoilData, SoilDataPushFailureReason>;
  let response: SoilDataPushEntry[];

  beforeEach(() => {
    unsyncedChanges = {};
    response = [];
  });

  test('returns soil data with input revision ids', () => {
    unsyncedChanges.a = {revisionId: 10};
    response = [
      {
        siteId: 'a',
        result: {
          soilData: {
            crossSlope: 'CONCAVE',
          } as SoilDataNode,
        },
      },
    ];

    const results = mutationResponseToResults(unsyncedChanges, response);
    expect(results.data.a).toEqual({
      revisionId: 10,
      value: {
        crossSlope: 'CONCAVE',
      },
    });
    expect(results.errors).toEqual({});
  });

  test('returns errors with input revision ids', () => {
    unsyncedChanges.a = {revisionId: 10};
    response = [
      {
        siteId: 'a',
        result: {
          reason: 'DOES_NOT_EXIST',
        },
      },
    ];
    const results = mutationResponseToResults(unsyncedChanges, response);
    expect(results.data).toEqual({});
    expect(results.errors.a).toEqual({revisionId: 10, value: 'DOES_NOT_EXIST'});
  });
});
