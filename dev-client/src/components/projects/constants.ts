import {Site} from 'terraso-client-shared/site/siteSlice';
import {ProjectPrivacy} from '../../types';
import {User} from 'terraso-client-shared/account/accountSlice';
import {Membership} from 'terraso-client-shared/memberships/membershipsSlice';

export const enum TabRoutes {
  INPUTS = 'Inputs',
  TEAM = 'Team',
  SETTINGS = 'Settings',
  SITES = 'Sites',
}

export type TabStackParamList = {
  [TabRoutes.INPUTS]: undefined;
  [TabRoutes.TEAM]: {memberships: [Membership, User][]; projectId: string};
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
