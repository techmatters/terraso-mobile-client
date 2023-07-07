import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {ProjectPreview, Project, SiteDisplay, ProjectName} from '../types';

export const enum ScreenRoutes {
  LOGIN = 'LOGIN',
  PROJECT_LIST = 'PROJECT_LIST',
  PROJECT_VIEW = 'PROJECT_VIEW',
  SITES_MAP = 'SITES_MAP',
  CREATE_PROJECT = 'CREATE_PROJECT',
  SITE_TRANSFER_PROJECT = 'SITE_TRANSFER_PROJECT',
  CREATE_SITE = 'CREATE_SITE',
}

export type RootStackParamList = {
  [ScreenRoutes.LOGIN]: undefined;
  [ScreenRoutes.PROJECT_LIST]: {projects: ProjectPreview[]};
  [ScreenRoutes.PROJECT_VIEW]: {project: Project};
  [ScreenRoutes.SITES_MAP]: {sites: SiteDisplay[]};
  [ScreenRoutes.CREATE_PROJECT]: undefined;
  [ScreenRoutes.SITE_TRANSFER_PROJECT]: {
    projectId: number;
  };
  [ScreenRoutes.CREATE_SITE]: undefined;
};

export type TopLevelScreenProps<R extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, R>;
