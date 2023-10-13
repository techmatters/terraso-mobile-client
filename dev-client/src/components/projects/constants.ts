import {ProjectPrivacy} from '../../types';
import {User} from 'terraso-client-shared/account/accountSlice';
import {ProjectMembership} from 'terraso-client-shared/project/projectSlice';

export const enum TabRoutes {
  INPUTS = 'Inputs',
  TEAM = 'Team',
  SETTINGS = 'Settings',
  SITES = 'Sites',
}

export type TabStackParamList = {
  [TabRoutes.INPUTS]: {projectId: string};
  [TabRoutes.TEAM]: {
    memberships: [ProjectMembership, User][];
    projectId: string;
  };
  [TabRoutes.SETTINGS]: {
    name: string;
    description: string;
    projectId: string;
    privacy: ProjectPrivacy;
    downloadLink: string;
  };
  [TabRoutes.SITES]: {
    projectId: string;
  };
};
