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

import {useCallback} from 'react';

import {Project, ProjectRole} from 'terraso-client-shared/project/projectTypes';

import {
  canEditProject,
  canEditSite,
  userHasProjectRole,
} from 'terraso-mobile-client/model/permissions/permissions';
import {useSelector} from 'terraso-mobile-client/store';
import {
  selectSite,
  selectUserRoleProject,
  selectUserRoleSite,
} from 'terraso-mobile-client/store/selectors';

type ProjectFilter = (project: Project) => boolean;

export const useProjectUserRolesFilter = (
  userRoles?: ProjectRole[],
): ProjectFilter => {
  const currentUser = useSelector(state => state.account.currentUser.data);
  return useCallback(
    project => userHasProjectRole(currentUser, project, userRoles),
    [currentUser, userRoles],
  );
};

export const useRoleCanEditProject = (projectId: string) => {
  const userRole = useSelector(state =>
    selectUserRoleProject(state, projectId),
  );
  return canEditProject(userRole);
};

export const useRoleCanEditSite = (siteId: string) => {
  const userRole = useSelector(state => selectUserRoleSite(state, siteId));
  return canEditSite(userRole);
};

export const useUserCanEditSiteNote = ({
  siteId,
  noteId,
}: {
  siteId: string;
  noteId: string;
}) => {
  const userRole = useSelector(state => selectUserRoleSite(state, siteId));

  const site = useSelector(state => selectSite(siteId)(state));
  const note = site?.notes[noteId];
  const currentUser = useSelector(state => state.account.currentUser.data);
  const currentUserIsAuthor = !!note && note.authorId === currentUser?.id;

  return (
    userRole &&
    ((userRole.kind === 'site' && canEditSite(userRole)) ||
      (userRole.kind === 'project' &&
        canEditProject(userRole.role) &&
        currentUserIsAuthor))
  );
};
