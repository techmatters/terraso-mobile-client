import { Project } from "../types";

export const enum ScreenRoutes {
    LOGIN = "LOGIN",
    PROJECT_LIST = "PROJECT_LIST"
};

export type RootStackParamList = {
    [ScreenRoutes.LOGIN]: undefined;
    [ScreenRoutes.PROJECT_LIST]: { projects: Project[] }
}
