import { UserProfile } from "../../types";

export const enum TabRoutes {
  INPUTS = 'Inputs',
  TEAM = 'Team',
}

export type TabStackParamList = {
  [TabRoutes.INPUTS]: undefined;
  [TabRoutes.TEAM]: {users: UserProfile[]};
};
