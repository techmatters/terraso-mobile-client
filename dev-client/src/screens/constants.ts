import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ProjectPreview, Project} from '../types';
import {Site} from 'terraso-client-shared/site/siteSlice';

export const enum ScreenRoutes {
  LOGIN = 'LOGIN',
  PROJECT_LIST = 'PROJECT_LIST',
  PROJECT_VIEW = 'PROJECT_VIEW',
  HOME = 'HOME',
  CREATE_PROJECT = 'CREATE_PROJECT',
  SITE_TRANSFER_PROJECT = 'SITE_TRANSFER_PROJECT',
  CREATE_SITE = 'CREATE_SITE',
}

export type RootStackParamList = {
  [ScreenRoutes.LOGIN]: undefined;
  [ScreenRoutes.PROJECT_LIST]: {projects: ProjectPreview[]};
  [ScreenRoutes.PROJECT_VIEW]: undefined;
  [ScreenRoutes.HOME]: undefined;
  [ScreenRoutes.CREATE_PROJECT]: undefined;
  [ScreenRoutes.SITE_TRANSFER_PROJECT]: {
    projectId: number;
  };
  [ScreenRoutes.CREATE_SITE]:
    | {
        mapCoords: Pick<Site, 'latitude' | 'longitude'>;
      }
    | undefined;
};

export type TopLevelScreenProps<R extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, R>;
