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

import {UserPreview} from 'terraso-mobile-client/types/users.types';
import {SitePreview} from 'terraso-mobile-client/types/sites.types';

export interface ProjectName {
  name: string;
  id: string;
  privacy: ProjectPrivacy;
}

export type ProjectPreview = {
  id: number;
  name: string;
  description: string;
  siteCount: number;
  userCount: number;
  // TODO: check how this is being typed in Typescript PR
  lastModified: string;
  percentComplete: number;
  isNew: boolean;
};

export type Project = {
  meta: ProjectPreview;
  sites: SitePreview[];
  inputs: ProjectInputs;
  memberPermissions: 'view' | 'edit';
  users: UserPreview[];
};

export type ProjectPrivacy = 'PRIVATE' | 'PUBLIC';

export type ProjectInputs = {
  units: 'imperial' | 'metric';
  source: 'survey' | 'soilgrids';
};
