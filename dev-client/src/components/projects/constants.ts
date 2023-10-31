import {ProjectPrivacy} from 'terraso-mobile-client/types';

export const enum TabRoutes {
  INPUTS = 'Inputs',
  TEAM = 'Team',
  SETTINGS = 'Settings',
  SITES = 'Sites',
}

export type TabStackParamList = {
  [TabRoutes.INPUTS]: {projectId: string};
  [TabRoutes.TEAM]: {
    projectId: string;
  };
  [TabRoutes.SETTINGS]: {
    projectId: string;
    downloadLink: string;
  };
  [TabRoutes.SITES]: {
    projectId: string;
  };
};
