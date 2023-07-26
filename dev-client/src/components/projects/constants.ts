import {Site} from 'terraso-client-shared/site/siteSlice';
import {ProjectPrivacy} from '../../types';
import {Project} from 'terraso-client-shared/project/projectSlice';

export const enum TabRoutes {
  INPUTS = 'Inputs',
  TEAM = 'Team',
  SETTINGS = 'Settings',
  SITES = 'Sites',
}

export type TabStackParamList = {
  [TabRoutes.INPUTS]: undefined;
  [TabRoutes.TEAM]: {memberships: Project['members']; projectId: string};
  [TabRoutes.SETTINGS]: {
    name: string;
    description: string;
    projectId: string;
    privacy: ProjectPrivacy;
    downloadLink: string;
  };
  [TabRoutes.SITES]: {
    projectId: string;
    sites: Site[];
  };
};
