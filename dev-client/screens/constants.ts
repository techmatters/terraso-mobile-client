import { ProjectPreview, Project } from "../types";

export const enum ScreenRoutes {
    LOGIN = "LOGIN",
    PROJECT_LIST = "PROJECT_LIST",
    PROJECT_VIEW = "PROJECT_VIEW"
};

export type RootStackParamList = {
    [ScreenRoutes.LOGIN]: undefined;
    [ScreenRoutes.PROJECT_LIST]: { projects: ProjectPreview[] };
    [ScreenRoutes.PROJECT_VIEW]: { project: Project };
}
