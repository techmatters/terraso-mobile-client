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
import {SiteUserRole} from 'terraso-client-shared/selectors';

export const matchesOne =
  <T>(cmp: (a: T, b: T) => boolean) =>
  (examples: T[]) =>
  (sample: T) =>
    examples.filter(x => cmp(x, sample)).length > 0;

export const matchesRole = matchesOne(
  (a: SiteUserRole, b: SiteUserRole) => a.kind === b.kind && a.role === b.role,
);

export const isSiteManager = matchesRole([
  {kind: 'site', role: 'OWNER'},
  {kind: 'project', role: 'MANAGER'},
]);

export const SITE_EDITOR_ROLES: SiteUserRole[] = [
  {kind: 'project', role: 'MANAGER'},
  {kind: 'project', role: 'CONTRIBUTOR'},
  {kind: 'site', role: 'OWNER'},
];

export const PROJECT_EDITOR_ROLES: ProjectMembershipProjectRoleChoices[] = [
  'MANAGER',
  'CONTRIBUTOR',
];

export const isProjectViewer = (userRole: SiteUserRole | null) => {
  return Boolean(userRole && ['VIEWER'].includes(userRole.role));
};

export const isProjectEditor = (userRole: SiteUserRole | null) => {
  return Boolean(
    userRole && ['MANAGER', 'CONTRIBUTOR', 'OWNER'].includes(userRole.role),
  );
};
