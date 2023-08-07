import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import ProjectInputTab from './ProjectInputTab';
import {useTheme} from 'native-base';
import ProjectTeamTab from './ProjectTeamTab';
import {TabRoutes, TabStackParamList} from './constants';
import ProjectSettingsTab from './ProjectSettingsTab';
import ProjectSitesTab from './ProjectSitesTab';
import {Icon} from '../common/Icons';
import {Project} from 'terraso-client-shared/project/projectSlice';
import {useSelector} from '../../model/store';
import {useMemo} from 'react';
import {Membership} from 'terraso-client-shared/memberships/membershipsSlice';
import {User} from 'terraso-client-shared/account/accountSlice';

const Tab = createMaterialTopTabNavigator<TabStackParamList>();
type ScreenOptions = React.ComponentProps<
  (typeof Tab)['Navigator']
>['screenOptions'];

type Props = {project: Project};

export default function ProjectTabs({project}: Props) {
  const {colors} = useTheme();

  const tabIconNames: Record<keyof TabStackParamList, string> = {
    Inputs: 'tune',
    Team: 'people',
    Settings: 'settings',
    Sites: 'location-on',
  };

  const screenOptions: ScreenOptions = ({route}) => {
    let iconName = tabIconNames[route.name];

    return {
      tabBarScrollEnabled: true,
      tabBarIcon: ({color}) => {
        return <Icon name={iconName} color={color} />;
      },
      tabBarActiveTintColor: colors.primary.contrast,
      tabBarInactiveTintColor: colors.secondary.main,
      tabBarItemStyle: {width: 100, flexDirection: 'row'},
      tabBarStyle: {
        backgroundColor: colors.grey[200],
      },
      tabBarIndicatorStyle: {
        backgroundColor: colors.secondary.main,
        height: '100%',
      },
    };
  };

  const projectMembershipsList = useSelector(
    state => state.memberships.members.list,
  );

  const projectMemberships = useMemo(
    () =>
      Object.entries<Membership | undefined>(
        projectMembershipsList || [],
      ).reduce(
        (acc, [id, membership]) => {
          if (id in project.membershipIds && membership !== undefined) {
            acc[id] = membership;
          }
          return acc;
        },
        {} as Record<string, Membership>,
      ),
    [projectMembershipsList, project],
  );

  const projectUserIds: [Membership, string][] = useMemo(
    () =>
      Object.entries(project.membershipIds).map(
        ([membershipId, {user: userId}]) => [
          projectMemberships[membershipId],
          userId,
        ],
      ),
    [project, projectMemberships],
  );

  // lol
  const userIdsInProject = useMemo(
    () => new Set(Object.values(project.membershipIds).map(m => m.user)),
    [project],
  );

  const projectUsersState = useSelector(state => state.account.users);

  const projectUsers = useMemo(
    () =>
      Object.entries<User>(projectUsersState).reduce(
        (acc, [id, user]) => {
          if (userIdsInProject.has(id)) {
            acc[id] = user;
          }
          return acc;
        },
        {} as Record<string, User>,
      ),
    [projectUsersState, userIdsInProject],
  );

  const projectMembers: [Membership, User][] = useMemo(
    () =>
      projectUserIds.map(([membership, userId]) => [
        membership,
        projectUsers[userId],
      ]),
    [projectUsers, projectUserIds],
  );

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name={TabRoutes.SETTINGS}
        component={ProjectSettingsTab}
        initialParams={{
          projectId: project.id,
          name: project.name,
          description: project.description,
          privacy: project.privacy,
          downloadLink: 'https://s3.amazon.com/mydownload',
        }}
      />
      <Tab.Screen name={TabRoutes.INPUTS} component={ProjectInputTab} />
      <Tab.Screen
        name={TabRoutes.TEAM}
        component={ProjectTeamTab}
        initialParams={{memberships: projectMembers, projectId: project.id}}
      />

      <Tab.Screen
        name={TabRoutes.SITES}
        component={ProjectSitesTab}
        initialParams={{
          projectId: project.id,
        }}
      />
    </Tab.Navigator>
  );
}
