import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import ProjectInputTab from './ProjectInputTab';
import ProjectTeamTab from './ProjectTeamTab';
import {TabRoutes, TabStackParamList} from './constants';
import ProjectSettingsTab from './ProjectSettingsTab';
import ProjectSitesTab from './ProjectSitesTab';
import {Icon} from '../common/Icons';
import {
  Project,
  ProjectMembership,
} from 'terraso-client-shared/project/projectSlice';
import {useSelector} from '../../model/store';
import {useMemo} from 'react';
import {User} from 'terraso-client-shared/account/accountSlice';
import {useDefaultTabOptions} from '../../screens/TabBar';

const TEMP_DOWNLOAD_LINK = 'https://s3.amazon.com/mydownload';

const Tab = createMaterialTopTabNavigator<TabStackParamList>();
type ScreenOptions = React.ComponentProps<
  (typeof Tab)['Navigator']
>['screenOptions'];

type Props = {project: Project};

export default function ProjectTabs({project}: Props) {
  const defaultTabOptions = useDefaultTabOptions();

  const tabIconNames: Record<keyof TabStackParamList, string> = {
    Inputs: 'tune',
    Team: 'people',
    Settings: 'settings',
    Sites: 'location-on',
  };

  const screenOptions: ScreenOptions = ({route}) => {
    let iconName = tabIconNames[route.name];

    return {
      ...defaultTabOptions,
      tabBarIcon: ({color}) => {
        return <Icon name={iconName} color={color} />;
      },
    };
  };

  const users = useSelector(state => state.account.users);

  const projectMembers: [ProjectMembership, User][] = useMemo(
    () =>
      Object.values<ProjectMembership>(project.memberships)
        .filter(({userId}) => userId in users)
        .map(membership => [membership, users[membership.userId]]),
    [project.memberships, users],
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
          downloadLink: TEMP_DOWNLOAD_LINK,
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
