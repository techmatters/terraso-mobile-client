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
  DepthIntervalChange,
  FieldChange,
  gatherDepthDependentData,
  gatherDepthIntervals,
  SoilDataChangeSet,
} from 'terraso-mobile-client/model/soilId/persistence/soilDataChanges';
import {SyncState} from 'terraso-mobile-client/model/sync/syncRecords';

export const sync = async (
  syncState: Record<string, SyncState<SoilData | undefined, SoilDataChangeSet>>,
): Promise<Record<string, SoilData>> => {
  const results: Record<string, SoilData> = {};
  for (const [siteId, entry] of Object.entries(syncState)) {
    if (entry.state) {
      /* NOTE: what do we do if the state is undefined? when does this happen? */
      results[siteId] = await syncSoilData(
        siteId,
        entry.state,
        entry.changeData,
      );
    }
  }
  return results;
};

export const syncSoilData = async (
  siteId: string,
  soilData: SoilData,
  changeSet: SoilDataChangeSet,
): Promise<SoilData> => {
  let finalResult = await soilDataService.updateSoilData(
    localDataToMutation(siteId, soilData, changeSet),
  );

  const depthIntervals = gatherDepthIntervals(soilData);
  for (const [depthInterval, change] of Object.entries(
    changeSet.depthIntervalChanges,
  )) {
    if (change.deleted) {
      finalResult = await soilDataService.deleteSoilDataDepthInterval(
        localDataToDepthIntervalDeletion(siteId, depthIntervals[depthInterval]),
      );
    } else {
      finalResult = await soilDataService.updateSoilDataDepthInterval(
        localDataToDepthIntervalMutation(
          siteId,
          depthIntervals[depthInterval],
          change,
        ),
      );
    }
  }

  const depthDependentData = gatherDepthDependentData(soilData);
  for (const [depthInterval, change] of Object.entries(
    changeSet.depthDependentDataChanges,
  )) {
    finalResult = await soilDataService.updateDepthDependentSoilData(
      localDataToDepthDependentMutation(
        siteId,
        depthDependentData[depthInterval],
        change,
      ),
    );
  }
  return finalResult;
};

export const localDataToMutation = (
  siteId: string,
  data: SoilData,
  changeData: SoilDataChangeSet,
): SoilDataUpdateMutationInput => {
  return {
    siteId: siteId,
    ...gatherFields(changeData.fieldChanges, data),
  };
};

export const localDataToDepthIntervalDeletion = (
  siteId: string,
  data: SoilDataDepthInterval,
): SoilDataDeleteDepthIntervalMutationInput => {
  return {
    siteId: siteId,
    depthInterval: data.depthInterval,
  };
};

export const localDataToDepthIntervalMutation = (
  siteId: string,
  data: SoilDataDepthInterval,
  changeData: DepthIntervalChange,
): SoilDataUpdateDepthIntervalMutationInput => {
  return {
    siteId: siteId,
    depthInterval: changeData.depthInterval,
    ...gatherFields(changeData.fieldChanges, data),
  };
};

export const localDataToDepthDependentMutation = (
  siteId: string,
  data: DepthDependentSoilData,
  changeData: DepthIntervalChange,
): DepthDependentSoilDataUpdateMutationInput => {
  return {
    siteId: siteId,
    depthInterval: changeData.depthInterval,
    ...gatherFields(changeData.fieldChanges, data),
  };
};

export const gatherFields = (
  fields: Record<string, FieldChange>,
  mutationInput: any,
): Record<string, any> => {
  const mutatedFields: Record<string, any> = {};
  for (const field of Object.keys(fields)) {
    if (field in mutationInput && mutationInput[field] !== undefined)
      mutatedFields[field] = mutationInput[field];
  }
  return mutatedFields;
};
