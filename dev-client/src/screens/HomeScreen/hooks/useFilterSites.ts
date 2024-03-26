/*
 * Copyright © 2023 Technology Matters
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

import {useMemo} from 'react';
import {ProjectRole} from 'terraso-client-shared/project/projectSlice';
import {Site} from 'terraso-client-shared/site/siteSlice';

export type SiteFilter = {
  projectId?: string;
  role?: ProjectRole;
};

export const useFilterSites = (
  sites: Site[],
  roleMap: Record<string, ProjectRole | undefined>,
  filter: SiteFilter,
) =>
  useMemo(
    () =>
      sites.filter(site => {
        const matchesProject =
          filter.projectId === undefined || filter.projectId === site.projectId;
        let matchesRole = true;
        if (filter.role) {
          const siteRole = roleMap[site.id];
          matchesRole = siteRole === filter.role;
        }
        return matchesProject && matchesRole;
      }),
    [sites, filter, roleMap],
  );
