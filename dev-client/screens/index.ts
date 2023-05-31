import LoginScreen from "./LoginScreen";
import ProjectListScreen from './ProjectListScreen';
import { ScreenRoutes, RootStackParamList as PrivateRootStackParamList } from './constants';
import ProjectViewScreen from "./ProjectViewScreen";
import SiteMapScreen from "./SiteMapScreen";

// TODO: Let's figure out how to type this properly
export type ScreenMap = Record<ScreenRoutes, any>;

export default {
    LOGIN: LoginScreen,
    PROJECT_LIST: ProjectListScreen,
    PROJECT_VIEW: ProjectViewScreen,
    SITES_MAP: SiteMapScreen,
} as ScreenMap;

export const LoggedOut : Set<ScreenRoutes> = new Set([ScreenRoutes.LOGIN]);

export type RootStackParamList = PrivateRootStackParamList;
