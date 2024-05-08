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

import {AppState} from 'terraso-mobile-client/store';

export const testState: Partial<AppState> = {
  account: {
    currentUser: {
      data: {
        id: '1',
        email: 'test@domain.com',
        firstName: 'firstname',
        lastName: 'lastname',
        profileImage: '',
        preferences: {},
      },
      fetching: false,
    },
    users: {
      '1': {
        id: '1',
        email: 'test@domain.com',
        firstName: 'firstname',
        lastName: 'lastname',
        profileImage: '',
        preferences: {},
      },
    },
  } as any,
  site: {
    sites: {
      '1': {
        id: '1',
        name: '1',
        latitude: 1,
        longitude: 1,
        elevation: 1,
        privacy: 'PRIVATE',
        archived: false,
        updatedAt: '',
        notes: {},
        projectId: '1',
      },
    },
  },
  project: {
    projects: {
      '1': {
        id: '1',
        name: '1',
        privacy: 'PRIVATE',
        archived: false,
        updatedAt: '',
        measurementUnits: 'METRIC',
        description: 'desc',
        memberships: {},
        sites: {'1': true},
      },
    },
  },
};
