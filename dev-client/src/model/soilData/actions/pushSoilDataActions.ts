/*
 * Copyright © 2026 Technology Matters
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

import * as soilDataService from 'terraso-client-shared/soilId/soilDataService';
import type {SoilData} from 'terraso-client-shared/soilId/soilIdTypes';

import {
  getChangedDepthDependentData,
  getChangedDepthIntervals,
  getChangedSoilDataFields,
  getDeletedDepthIntervals,
} from 'terraso-mobile-client/model/soilData/actions/soilDataDiff';
import type {SyncRecord} from 'terraso-mobile-client/model/sync/records';

export const pushSoilDataForSite = async (
  siteId: string,
  record: SyncRecord<SoilData, string>,
  soilData: SoilData | undefined,
): Promise<SoilData> => {
  if (!soilData) {
    throw new Error(`Cannot push soil data for ${siteId}: no data`);
  }

  let result: SoilData = soilData;

  const changedFields = getChangedSoilDataFields(
    soilData,
    record.lastSyncedData,
  );
  if (Object.keys(changedFields).length > 0) {
    result = await soilDataService.updateSoilData({siteId, ...changedFields});
  }

  for (const changes of getChangedDepthIntervals(
    soilData,
    record.lastSyncedData,
  )) {
    result = await soilDataService.updateSoilDataDepthInterval({
      siteId,
      depthInterval: changes.depthInterval,
      ...changes.changedFields,
    });
  }

  for (const depthInterval of getDeletedDepthIntervals(
    soilData,
    record.lastSyncedData,
  )) {
    try {
      result = await soilDataService.deleteSoilDataDepthInterval({
        siteId,
        depthInterval,
      });
    } catch {
      // Already deleted on server — treat as success
    }
  }

  for (const changes of getChangedDepthDependentData(
    soilData,
    record.lastSyncedData,
  )) {
    result = await soilDataService.updateDepthDependentSoilData({
      siteId,
      depthInterval: changes.depthInterval,
      ...changes.changedFields,
    });
  }

  return result;
};
