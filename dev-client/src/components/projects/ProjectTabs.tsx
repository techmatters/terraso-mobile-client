import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import {ProjectInputTab} from 'terraso-mobile-client/components/projects/ProjectInputTab';
import ProjectTeamTab from 'terraso-mobile-client/components/projects/ProjectTeamTab';
import {
  TabRoutes,
  TabStackParamList,
} from 'terraso-mobile-client/components/projects/constants';
import ProjectSettingsTab from 'terraso-mobile-client/components/projects/ProjectSettingsTab';
import ProjectSitesTab from 'terraso-mobile-client/components/projects/ProjectSitesTab';
import {Icon} from 'terraso-mobile-client/components/common/Icons';
import {Project} from 'terraso-client-shared/project/projectSlice';
import {useDefaultTabOptions} from 'terraso-mobile-client/screens/TabBar';

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

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name={TabRoutes.SETTINGS}
        component={ProjectSettingsTab}
        initialParams={{
          projectId: project.id,
          downloadLink: TEMP_DOWNLOAD_LINK,
        }}
      />
      <Tab.Screen
        name={TabRoutes.INPUTS}
        component={ProjectInputTab}
        initialParams={{projectId: project.id}}
      />
      <Tab.Screen
        name={TabRoutes.TEAM}
        component={ProjectTeamTab}
        initialParams={{projectId: project.id}}
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
