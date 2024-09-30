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
  DepthDependentSoilDataUpdateMutationInput,
  SoilDataDeleteDepthIntervalMutationInput,
  SoilDataUpdateDepthIntervalMutationInput,
  SoilDataUpdateMutationInput,
} from 'terraso-client-shared/graphqlSchema/graphql';
import * as soilDataService from 'terraso-client-shared/soilId/soilDataService';
import {
  DepthDependentSoilData,
  SoilData,
  SoilDataDepthInterval,
} from 'terraso-client-shared/soilId/soilIdTypes';

import {
  DepthDependentChange,
  DepthIntervalChange,
  gatherDepthDependentData,
  gatherDepthIntervals,
  SoilDataChanges,
} from 'terraso-mobile-client/model/soilId/sync/soilDataChanges';
import {gatherChangedFields} from 'terraso-mobile-client/model/sync/syncChanges';
import {
  gatherSyncState,
  SyncRecords,
} from 'terraso-mobile-client/model/sync/syncRecords';

export const sync = async (
  siteIds: string[],
  syncRecords: SyncRecords<SoilDataChanges>,
  soilData: Record<string, SoilData | undefined>,
): Promise<Record<string, SoilData>> => {
  const syncState = gatherSyncState(siteIds, soilData, syncRecords);
  const results: Record<string, SoilData> = {};
  for (const [siteId, entry] of Object.entries(syncState)) {
    if (entry.state) {
      /* NOTE: what do we do if the state is undefined? when does this happen? */
      results[siteId] = await syncSoilData(siteId, entry.state, entry.changes);
    }
  }
  return results;
};

export const syncSoilData = async (
  siteId: string,
  data: SoilData,
  changes: SoilDataChanges,
): Promise<SoilData> => {
  let finalResult = await soilDataService.updateSoilData(
    makeUpdateMutation(siteId, data, changes),
  );

  const depthIntervals = gatherDepthIntervals(data);
  for (const [depthInterval, change] of Object.entries(
    changes.depthIntervalChanges,
  )) {
    if (change.deleted) {
      finalResult = await soilDataService.deleteSoilDataDepthInterval(
        makeDepthIntervalDeletion(siteId, depthIntervals[depthInterval]),
      );
    } else {
      finalResult = await soilDataService.updateSoilDataDepthInterval(
        makeDepthIntervalMutation(
          siteId,
          depthIntervals[depthInterval],
          change,
        ),
      );
    }
  }

  const depthDependentData = gatherDepthDependentData(data);
  for (const [depthInterval, change] of Object.entries(
    changes.depthDependentChanges,
  )) {
    finalResult = await soilDataService.updateDepthDependentSoilData(
      makeDepthDependentMutation(
        siteId,
        depthDependentData[depthInterval],
        change,
      ),
    );
  }
  return finalResult;
};

export const makeUpdateMutation = (
  siteId: string,
  data: SoilData,
  changes: SoilDataChanges,
): SoilDataUpdateMutationInput => {
  return {
    siteId: siteId,
    ...gatherChangedFields(changes.fieldChanges, data),
  };
};

export const makeDepthIntervalDeletion = (
  siteId: string,
  data: SoilDataDepthInterval,
): SoilDataDeleteDepthIntervalMutationInput => {
  return {
    siteId: siteId,
    depthInterval: data.depthInterval,
  };
};

export const makeDepthIntervalMutation = (
  siteId: string,
  data: SoilDataDepthInterval,
  changes: DepthIntervalChange,
): SoilDataUpdateDepthIntervalMutationInput => {
  return {
    siteId: siteId,
    depthInterval: changes.depthInterval,
    ...gatherChangedFields(changes.fieldChanges, data),
  };
};

export const makeDepthDependentMutation = (
  siteId: string,
  data: DepthDependentSoilData,
  changes: DepthDependentChange,
): DepthDependentSoilDataUpdateMutationInput => {
  return {
    siteId: siteId,
    depthInterval: changes.depthInterval,
    ...gatherChangedFields(changes.fieldChanges, data),
  };
};
