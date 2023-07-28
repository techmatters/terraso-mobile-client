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

  const projectMemberships = useSelector(state =>
    Object.entries<Membership | undefined>(
      state.memberships.members.list || [],
    ).reduce(
      (acc, [id, membership]) => {
        if (id in project.membershipIds && membership !== undefined) {
          acc[id] = membership;
        }
        return acc;
      },
      {} as Record<string, Membership>,
    ),
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

  const projectUsers = useSelector(state =>
    Object.entries<User>(state.account.users).reduce(
      (acc, [id, user]) => {
        if (id in projectUserIds) {
          acc[id] = user;
        }
        return acc;
      },
      {} as Record<string, User>,
    ),
  );

  const projectMembers: [Membership, User][] = useMemo(
    () =>
      projectUserIds.map(([membership, userId]) => [
        membership,
        projectUsers[userId],
      ]),
    [projectUsers, projectUserIds],
  );

  const projectSites = useSelector(state =>
    Object.values(state.site.sites).filter(site => site.id in project.siteIds),
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
          sites: projectSites,
        }}
      />
    </Tab.Navigator>
  );
}
