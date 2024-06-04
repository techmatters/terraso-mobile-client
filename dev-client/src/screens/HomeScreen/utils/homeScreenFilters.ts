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

import {ProjectMembershipProjectRoleChoices} from 'terraso-client-shared/graphqlSchema/graphql';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {normalizeText} from 'terraso-client-shared/utils';

import {SortingOption} from 'terraso-mobile-client/components/ListFilter';
import {equals, searchText} from 'terraso-mobile-client/util';

export const getHomeScreenFilters = (
  siteDistances: Record<string, number> | null,
  siteProjectRoles: {
    [k: string]: ProjectMembershipProjectRoleChoices | undefined;
  },
) => {
  const distanceSorting: Record<string, SortingOption<Site>> | undefined =
    siteDistances === null
      ? undefined
      : {
          distanceAsc: {
            record: siteDistances,
            key: 'id',
            order: 'ascending',
          },
          distanceDesc: {
            record: siteDistances,
            key: 'id',
            order: 'descending',
          },
        };

  return {
    search: {
      kind: 'filter',
      f: searchText,
      preprocess: normalizeText,
      lookup: {
        key: ['name', 'notes.content'],
      },
      hide: true,
    },
    role: {
      kind: 'filter',
      f: equals,
      lookup: {
        record: siteProjectRoles,
        key: 'id',
      },
    },
    project: {
      kind: 'filter',
      f: equals,
      lookup: {
        key: 'projectId',
      },
    },
    sort: {
      kind: 'sorting',
      options: {
        nameDesc: {
          key: 'name',
          order: 'descending',
        },
        nameAsc: {
          key: 'name',
          order: 'ascending',
        },
        lastModDesc: {
          key: 'updatedAt',
          order: 'descending',
        },
        lastModAsc: {
          key: 'updatedAt',
          order: 'ascending',
        },
        ...distanceSorting,
      },
    },
  } as const;
};
