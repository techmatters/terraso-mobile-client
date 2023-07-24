import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import ProjectInputTab from './ProjectInputTab';
import {useTheme} from 'native-base';
import ProjectTeamTab from './ProjectTeamTab';
import {USER_PROFILES, fetchProject} from '../../dataflow';
import {TabRoutes, TabStackParamList} from './constants';
import ProjectSettingsTab from './ProjectSettingsTab';
import ProjectSitesTab from './ProjectSitesTab';
import {Icon} from '../common/Icons';
import {Project} from 'terraso-client-shared/project/projectSlice';

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
        initialParams={{users: USER_PROFILES}}
      />
      <Tab.Screen
        name={TabRoutes.SITES}
        component={ProjectSitesTab}
        initialParams={{
          projectId: 1,
          sites: fetchProject(1).sites,
          //sites: [],
        }}
      />
    </Tab.Navigator>
  );
}
