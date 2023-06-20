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

export type UserPreview = {
  name: string;
  id: number;
};

export type Role = 'member' | 'manager';

export type ProjectPrivacy = 'private' | 'public';

export type UserProfile = {
  firstName: string;
  lastName?: string;
  role: Role;
  id: number;
};

export type ProjectInputs = {
  units: 'imperial' | 'metric';
  source: 'survey' | 'soilgrids';
};

export type SiteDisplay = {
  lat: number;
  lon: number;
  name: string;
  id: number;
};

export type SitePreview = {
  id: number;
  name: string;
  lastModified: {
    user: UserPreview;
    date: string;
  };
  percentComplete: number;
};
