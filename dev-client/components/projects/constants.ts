import {ProjectPrivacy, UserProfile} from '../../types';

export const enum TabRoutes {
  INPUTS = 'Inputs',
  TEAM = 'Team',
  SETTINGS = 'Settings',
}

export type TabStackParamList = {
  [TabRoutes.INPUTS]: undefined;
  [TabRoutes.TEAM]: {users: UserProfile[]};
  [TabRoutes.SETTINGS]: {
    name: string;
    description: string;
    projectId: number;
    privacy: ProjectPrivacy;
    downloadLink: string;
  };
};
