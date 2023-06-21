import {SitePreview} from './site.types';
import {UserPreview} from './user.types';
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

export type ProjectPrivacy = 'private' | 'public';

export type ProjectInputs = {
  units: 'imperial' | 'metric';
  source: 'survey' | 'soilgrids';
};
