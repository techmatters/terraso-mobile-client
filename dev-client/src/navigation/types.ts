/*
 * Copyright © 2023 Technology Matters
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see https://www.gnu.org/licenses/.
 */

import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {MaterialTopTabScreenProps} from '@react-navigation/material-top-tabs';
import {Coords} from 'terraso-mobile-client/model/map/mapSlice';
import {Site, SiteNote} from 'terraso-client-shared/site/siteSlice';
import {Project} from 'terraso-client-shared/project/projectSlice';

export const enum ProjectTabNavigatorScreens {
  INPUTS = 'INPUTS',
  TEAM = 'TEAM',
  SETTINGS = 'SETTINGS',
  SITES = 'SITES',
}

export const enum LocationDashboardTabNavigatorScreens {
  SITE = 'SITE',
  SLOPE = 'SLOPE',
  SOIL = 'SOIL',
  NOTES = 'NOTES',
}

export const enum BottomTabNavigatorScreens {
  HOME = 'HOME',
  PROJECT_LIST = 'PROJECT_LIST',
  SETTINGS = 'SETTINGS',
  SIGN_OUT = 'SIGN_OUT',
}

export enum RootNavigatorScreens {
  // Unauthenticated screens
  LOGIN = 'LOGIN',

  // Authenticated screens
  BOTTOM_TABS = 'BOTTOM_TABS', // Bottom tab navigator screen
  PROJECT_TABS = 'PROJECT_TABS', // Project top tab navigator screen
  LOCATION_DASHBOARD_TABS = 'LOCATION_DASHBOARD_TABS', // Location dashboard top tab navigator screen
  CREATE_PROJECT = 'CREATE_PROJECT',
  SITE_TRANSFER_PROJECT = 'SITE_TRANSFER_PROJECT',
  CREATE_SITE = 'CREATE_SITE',
  SITE_SETTINGS = 'SITE_SETTINGS',
  SITE_TEAM_SETTINGS = 'SITE_TEAM_SETTINGS',
  ADD_USER_PROJECT = 'ADD_USER_PROJECT',
  MANAGE_TEAM_MEMBER = 'MANAGE_TEAM_MEMBER',
  // Modal screens
  ADD_SITE_NOTE = 'ADD_SITE_NOTE',
  EDIT_SITE_NOTE = 'EDIT_SITE_NOTE',
  READ_NOTE = 'READ_NOTE',
  EDIT_PROJECT_INSTRUCTIONS = 'EDIT_PROJECT_INSTRUCTIONS',
}

export type Screens =
  | ProjectTabNavigatorScreens
  | LocationDashboardTabNavigatorScreens
  | BottomTabNavigatorScreens
  | RootNavigatorScreens;

export type ProjectTabNavigatorParamList = {
  [ProjectTabNavigatorScreens.INPUTS]: undefined;
  [ProjectTabNavigatorScreens.TEAM]: undefined;
  [ProjectTabNavigatorScreens.SETTINGS]: undefined;
  [ProjectTabNavigatorScreens.SITES]: undefined;
};

export type LocationDashboardTabNavigatorParamList = {
  [LocationDashboardTabNavigatorScreens.SITE]: undefined;
  [LocationDashboardTabNavigatorScreens.SLOPE]: undefined;
  [LocationDashboardTabNavigatorScreens.SOIL]: undefined;
  [LocationDashboardTabNavigatorScreens.NOTES]: undefined;
};

export type BottomTabNavigatorParamList = {
  [BottomTabNavigatorScreens.HOME]: {site?: Site};
  [BottomTabNavigatorScreens.PROJECT_LIST]: undefined;
  [BottomTabNavigatorScreens.SETTINGS]: undefined;
  [BottomTabNavigatorScreens.SIGN_OUT]: undefined;
};

export type ProjectTabsData = {
  projectId: string;
  downloadLink?: string;
};

type SiteIdBasedLocation = {
  siteId: string;
};

type CoordsBasedLocation = {
  coords: Coords;
};

export type LocationTabsData = SiteIdBasedLocation | CoordsBasedLocation;

type CoordsBasedSite = {
  coords: Coords;
};

type ProjectIdBasedSite = {
  projectId: string;
};

export type CreateSiteData =
  | CoordsBasedSite
  | ProjectIdBasedSite
  | {}
  | undefined;

export type RootNavigatorParamList = {
  [RootNavigatorScreens.LOGIN]: undefined;
  [RootNavigatorScreens.BOTTOM_TABS]: NavigatorScreenParams<BottomTabNavigatorParamList>;
  [RootNavigatorScreens.PROJECT_TABS]: ProjectTabsData;
  [RootNavigatorScreens.LOCATION_DASHBOARD_TABS]: LocationTabsData;
  [RootNavigatorScreens.CREATE_PROJECT]: undefined;
  [RootNavigatorScreens.SITE_TRANSFER_PROJECT]: {projectId: string};
  [RootNavigatorScreens.ADD_USER_PROJECT]: {
    projectId: string;
  };
  [RootNavigatorScreens.MANAGE_TEAM_MEMBER]: {
    projectId: string;
    userId: string;
    membershipId: string;
  };
  [RootNavigatorScreens.CREATE_SITE]: CreateSiteData;
  [RootNavigatorScreens.SITE_SETTINGS]: {siteId: string};
  [RootNavigatorScreens.SITE_TEAM_SETTINGS]: {
    siteId: string;
  };
  [RootNavigatorScreens.ADD_SITE_NOTE]: {siteId: string};
  [RootNavigatorScreens.EDIT_SITE_NOTE]: {note: SiteNote};
  [RootNavigatorScreens.READ_NOTE]: {
    content: string;
    isSiteInstructions?: boolean;
  };
  [RootNavigatorScreens.EDIT_PROJECT_INSTRUCTIONS]: {
    project: Project;
  };
};

export type RootNavigatorScreenProps<T extends keyof RootNavigatorParamList> =
  NativeStackScreenProps<RootNavigatorParamList, T>;

export type BottomTabNavigatorScreenProps<
  T extends keyof BottomTabNavigatorParamList,
> = CompositeScreenProps<
  BottomTabScreenProps<BottomTabNavigatorParamList, T>,
  RootNavigatorScreenProps<keyof RootNavigatorParamList>
>;

export type LocationDashboardTabNavigatorScreenProps<
  T extends keyof LocationDashboardTabNavigatorParamList,
> = CompositeScreenProps<
  MaterialTopTabScreenProps<LocationDashboardTabNavigatorParamList, T>,
  RootNavigatorScreenProps<keyof RootNavigatorParamList>
>;

export type ProjectTabNavigatorScreenProps<
  T extends keyof ProjectTabNavigatorParamList,
> = CompositeScreenProps<
  MaterialTopTabScreenProps<ProjectTabNavigatorParamList, T>,
  RootNavigatorScreenProps<keyof RootNavigatorParamList>
>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootNavigatorParamList {}
  }
}
