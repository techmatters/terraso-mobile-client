import LoginScreen from "./LoginScreen";
import ProjectListScreen from './ProjectListScreen';
import { ScreenRoutes, RootStackParamList as PrivateRootStackParamList } from './constants';
import ProjectViewScreen from "./ProjectViewScreen";

export type ScreenMap = Record<ScreenRoutes, any>;

export default {
    LOGIN: LoginScreen,
    PROJECT_LIST: ProjectListScreen,
    PROJECT_VIEW: ProjectViewScreen,
} as ScreenMap;

export const LoggedOut : Set<ScreenRoutes> = new Set([ScreenRoutes.LOGIN]);

export type RootStackParamList = PrivateRootStackParamList;
