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

import type {
  SoilMetadataPushEntry,
  SoilMetadataPushFailureReason,
  SoilMetadataPushInputEntry,
} from 'terraso-client-shared/graphqlSchema/graphql';
import type {SoilMetadata} from 'terraso-client-shared/soilId/soilIdTypes';

import type {SyncRecords} from 'terraso-mobile-client/model/sync/records';
import {getEntityRecord} from 'terraso-mobile-client/model/sync/records';
import type {SyncResults} from 'terraso-mobile-client/model/sync/results';

export const unsyncedMetadataToMutationInput = (
  unsyncedChanges: SyncRecords<SoilMetadata, SoilMetadataPushFailureReason>,
  unsyncedData: Record<string, SoilMetadata | undefined>,
): SoilMetadataPushInputEntry[] => {
  return Object.keys(unsyncedChanges)
    .filter(siteId => unsyncedData[siteId] !== undefined)
    .map(siteId => ({
      siteId,
      // Future work: If more data is added to the soilMetadata with offline support, refer to patterns in soilDataDiff and unsyncedDataToMutationInputEntry to create similar soilMetadata diffing mechanism.
      userRatings: unsyncedData[siteId]!.userRatings.filter(
        rating => rating.rating !== null,
      ).map(rating => ({
        soilMatchId: rating.soilMatchId,
        rating: rating.rating as NonNullable<typeof rating.rating>,
      })),
    }));
};

// Note: The SoilMetadataPushEntrySuccess type in the response is a bit weird because it doesn't include the Site in the SoilMetadataNode
export const metadataMutationResponseToResults = (
  unsyncedChanges: SyncRecords<SoilMetadata, SoilMetadataPushFailureReason>,
  response: SoilMetadataPushEntry[],
): SyncResults<SoilMetadata, SoilMetadataPushFailureReason> => {
  const results: SyncResults<SoilMetadata, SoilMetadataPushFailureReason> = {
    data: {},
    errors: {},
  };

  for (const entry of response) {
    const {siteId, result} = entry;
    const revisionId = getEntityRecord(unsyncedChanges, siteId).revisionId;

    if ('soilMetadata' in result) {
      // Success case
      results.data[siteId] = {
        revisionId,
        value: result.soilMetadata as SoilMetadata,
      };
    } else if ('reason' in result) {
      // Failure case
      results.errors[siteId] = {
        revisionId,
        value: result.reason,
      };
    }
  }

  return results;
};
