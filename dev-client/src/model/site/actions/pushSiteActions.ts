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

import type {SiteAddMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import * as siteService from 'terraso-client-shared/site/siteService';
import type {Site} from 'terraso-client-shared/site/siteTypes';

import {getChangedSiteFields} from 'terraso-mobile-client/model/site/actions/siteDiff';
import type {SyncRecord} from 'terraso-mobile-client/model/sync/records';

export const pushSite = async (
  siteId: string,
  record: SyncRecord<Site, string>,
  site: Site | undefined,
): Promise<Site> => {
  if (!site) {
    throw new Error(`Cannot push site ${siteId}: no site data`);
  }

  if (record.lastSyncedData === undefined) {
    // New site — pass client-generated id for idempotency.
    // Backend accepts id but the TS type doesn't include it yet.
    return siteService.addSite({
      id: siteId,
      name: site.name,
      latitude: site.latitude,
      longitude: site.longitude,
      elevation: site.elevation ?? undefined,
      privacy: site.privacy,
      projectId: site.projectId ?? undefined,
    } as SiteAddMutationInput);
  } else {
    const changedFields = getChangedSiteFields(site, record.lastSyncedData);
    return siteService.updateSite({id: siteId, ...changedFields});
  }
};
