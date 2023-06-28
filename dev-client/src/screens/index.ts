import LoginScreen from './LoginScreen';
import ProjectListScreen from './ProjectListScreen';
import {
  ScreenRoutes,
  RootStackParamList as PrivateRootStackParamList,
} from './constants';
import ProjectViewScreen from './ProjectViewScreen';
import CreateProjectScreen from './CreateProjectScreen';
import SiteMapScreen from './SiteMapScreen';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {MainMenuBar, MapInfoIcon} from './HeaderIcons';
import {RouteProp} from '@react-navigation/native';
import {
  HeaderBackButtonProps,
  HeaderButtonProps,
} from '@react-navigation/native-stack/lib/typescript/src/types';
import {ReactNode} from 'react';
import {TFunction} from 'i18next';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import CloseButton from '../components/common/CloseButton';

export type RoutePath = keyof RootStackParamList;

export type ScreenConfig<RouteName extends RoutePath> = {
  screen: React.ComponentType<{
    route: RouteProp<RootStackParamList, RouteName>;
    navigation: any;
  }>;
  leftIcon?: (props: HeaderBackButtonProps) => ReactNode;
  rightIcon?: (props: HeaderButtonProps) => ReactNode;
  loggedOut?: boolean;
  hideBack?: boolean;
  paramTitle?: (args: {
    route: RouteProp<RootStackParamList, RouteName>;
    t: TFunction;
  }) => string;
};

export type ScreenMap = {
  [Property in RoutePath]: ScreenConfig<Property>;
};

const SCREENS: ScreenMap = {
  LOGIN: {
    screen: LoginScreen,
    loggedOut: true,
  },
  PROJECT_LIST: {
    screen: ProjectListScreen,
    hideBack: true,
  },
  PROJECT_VIEW: {
    screen: ProjectViewScreen,
    hideBack: true,
    paramTitle: ({t, route}) =>
      t(`screens.${route.name}`, {id: route.params.project.meta.id}) ??
      undefined,
  },
  SITES_MAP: {
    screen: SiteMapScreen,
    leftIcon: MainMenuBar,
    rightIcon: MapInfoIcon,
  },
  CREATE_PROJECT: {
    screen: CreateProjectScreen,
    leftIcon: CloseButton,
  },
};

export default SCREENS;

export const LoggedOut: Set<ScreenRoutes> = new Set([ScreenRoutes.LOGIN]);

export type RootStackParamList = PrivateRootStackParamList;

// see https://reactnavigation.org/docs/typescript/#annotating-usenavigation
export type SitesMapNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  ScreenRoutes.SITES_MAP
>;

export type TopLevelNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  keyof ScreenMap
>;
