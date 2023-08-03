import {UserPreview} from './users.types';
import {SitePreview} from './sites.types';

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
