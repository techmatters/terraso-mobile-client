import LoginScreen from "./LoginScreen";
import ProjectListScreen from './ProjectListScreen';
import { ScreenRoutes, RootStackParamList as PrivateRootStackParamList } from './constants';
import type { ProjectPreview } from '../types';

export type ScreenMap = Record<ScreenRoutes, any>;

export default {
    LOGIN: LoginScreen,
    PROJECT_LIST: ProjectListScreen
} as ScreenMap;

export const LoggedOut : Set<ScreenRoutes> = new Set([ScreenRoutes.LOGIN]);

export type RootStackParamList = PrivateRootStackParamList;
