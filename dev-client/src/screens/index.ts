import LoginScreen from './LoginScreen';
import ProjectListScreen from './ProjectListScreen';
import {
  ScreenRoutes,
  RootStackParamList as PrivateRootStackParamList,
} from './constants';
import ProjectViewScreen from './ProjectViewScreen';
import CreateProjectScreen from './CreateProjectScreen';
import HomeScreen from './HomeScreen';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {MainMenuBar, MapInfoIcon} from './HeaderIcons';
import {
  RouteProp,
  useNavigation as useNavigationBase,
} from '@react-navigation/native';
import {
  HeaderBackButtonProps,
  HeaderButtonProps,
} from '@react-navigation/native-stack/lib/typescript/src/types';
import {ReactNode} from 'react';
import {TFunction} from 'i18next';
import CloseButton from '../components/common/CloseButton';
import SiteTransferProject from './SiteTransferProject';
import CreateSiteScreen from './CreateSiteScreen';

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
      t(`screens.${route.name}`, {id: 'TO CHANGE'}) ?? undefined,
  },
  HOME: {
    screen: HomeScreen,
    leftIcon: MainMenuBar,
    rightIcon: MapInfoIcon,
  },
  CREATE_PROJECT: {
    screen: CreateProjectScreen,
    leftIcon: CloseButton,
  },
  SITE_TRANSFER_PROJECT: {
    screen: SiteTransferProject,
    paramTitle: ({t, route}) =>
      t(`screens.${route.name}`, {id: route.params.projectId} ?? undefined),
  },
  CREATE_SITE: {
    screen: CreateSiteScreen,
    leftIcon: CloseButton,
  },
};

export default SCREENS;

export const LoggedOut: Set<ScreenRoutes> = new Set([ScreenRoutes.LOGIN]);

export type RootStackParamList = PrivateRootStackParamList;

export type TopLevelNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  keyof ScreenMap
>;

export const useNavigation = () => useNavigationBase<TopLevelNavigationProp>();
