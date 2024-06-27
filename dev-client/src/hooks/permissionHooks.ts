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

import {Project, ProjectRole} from 'terraso-client-shared/project/projectSlice';

import {useSelector} from 'terraso-mobile-client/store';

type ProjectFilter = (project: Project) => boolean;

export const useProjectUserRolesFilter = (
  userRoles?: ProjectRole[],
): ProjectFilter => {
  const currentUser = useSelector(state => state.account.currentUser.data);
  if (userRoles) {
    return project =>
      /*
       * Filter returns whether we can find a membership for the project
       * that matches the current user and has a role in the accepted list
       */
      !!Object.values(project.memberships).find(
        membership =>
          currentUser?.id === membership.userId &&
          userRoles.includes(membership.userRole),
      );
  } else {
    return _ => true;
  }
};
