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

import {User} from 'terraso-client-shared/account/accountSlice';
import {
  Project,
  ProjectMembership,
  ProjectRole,
} from 'terraso-client-shared/project/projectSlice';

import {userHasProjectRole} from 'terraso-mobile-client/model/permissions/permissions';

const emptyUser = null;
const emptyRoles: ProjectRole[] = [];

const sampleUser: User = {
  id: '1',
  email: 'email@example.com',
  firstName: 'Test',
  lastName: 'Test',
  profileImage: '',
  preferences: {
    group_notifications: 'true',
    story_map_notifications: 'true',
    language: 'en-US',
  },
};

const emptyProject: Project = {
  id: '3',
  name: 'test',
  privacy: 'PUBLIC',
  measurementUnits: 'METRIC',
  description: 'test description',
  updatedAt: '8/28/2024',
  memberships: {},
  sites: {},
  archived: false,
};

const projectWithMemberships = (
  memberships: Record<string, ProjectMembership>,
): Project => {
  return {
    id: '4',
    name: 'test',
    privacy: 'PUBLIC',
    measurementUnits: 'METRIC',
    description: 'test description',
    updatedAt: '8/28/2024',
    memberships: memberships,
    sites: {},
    archived: false,
  };
};

const sampleProject = projectWithMemberships({
  sample: {userId: '1', userRole: 'MANAGER', id: '2'},
});

const sampleProject2 = projectWithMemberships({
  sample: {userId: '2', userRole: 'VIEWER', id: '3'},
});

const sampleManagerRoles: ProjectRole[] = ['MANAGER'];
const sampleViewerRoles: ProjectRole[] = ['VIEWER'];

describe('permission tests', () => {
  test('no user', () => {
    const result = userHasProjectRole(emptyUser, emptyProject, emptyRoles);

    expect(result).toBeFalsy();
  });

  test('user is in project with no role', () => {
    const result = userHasProjectRole(sampleUser, sampleProject);

    expect(result).toBeTruthy();
  });

  test('user is in project with role', () => {
    const result = userHasProjectRole(
      sampleUser,
      sampleProject,
      sampleManagerRoles,
    );

    expect(result).toBeTruthy();
  });

  test('user is in project with unexpected role', () => {
    const result = userHasProjectRole(
      sampleUser,
      sampleProject,
      sampleViewerRoles,
    );

    expect(result).toBeFalsy();
  });

  test('user is not in project', () => {
    const result = userHasProjectRole(
      sampleUser,
      sampleProject2,
      sampleManagerRoles,
    );

    expect(result).toBeFalsy();
  });
});
