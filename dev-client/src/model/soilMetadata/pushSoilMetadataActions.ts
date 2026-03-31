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

import type {SoilMetadata} from 'terraso-client-shared/soilId/soilIdTypes';
import * as soilMetadataService from 'terraso-client-shared/soilId/soilMetadataService';

import type {SyncRecord} from 'terraso-mobile-client/model/sync/records';

export const pushSoilMetadataForSite = async (
  siteId: string,
  _record: SyncRecord<SoilMetadata, string>,
  metadata: SoilMetadata | undefined,
): Promise<SoilMetadata> => {
  if (!metadata) {
    throw new Error(`Cannot push soil metadata for ${siteId}: no data`);
  }

  return soilMetadataService.updateSoilMetadata({
    siteId,
    userRatings: metadata.userRatings
      .filter(r => r.rating !== null)
      .map(r => ({
        soilMatchId: r.soilMatchId,
        rating: r.rating as NonNullable<typeof r.rating>,
      })),
  });
};
