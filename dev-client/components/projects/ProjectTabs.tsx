import {
  MaterialTopTabNavigationOptions,
  createMaterialTopTabNavigator,
} from '@react-navigation/material-top-tabs';
import ProjectInputTab from './ProjectInputTab';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {Icon, useTheme} from 'native-base';
import {RouteProp} from '@react-navigation/native';
import ProjectTeamTab from './ProjectTeamTab';
import {USER_PROFILES} from '../../dataflow';
import {TabRoutes, TabStackParamList} from './constants';

const Tab = createMaterialTopTabNavigator<TabStackParamList>();

// TODO: There must be a better way
type TabRouteProp = {
  route: RouteProp<TabStackParamList, keyof TabStackParamList>;
};

export default function ProjectTabs() {
  const {colors} = useTheme(); //TODO: Is it better to use useToken?

  function screenOptions({
    route,
  }: TabRouteProp): MaterialTopTabNavigationOptions {
    // TODO: Use a Record type
    let iconName = 'tune';
    switch (route.name) {
      case TabRoutes.INPUTS:
        iconName = 'tune';
        break;
      case TabRoutes.TEAM:
        iconName = 'people';
    }

    return {
      tabBarIcon: ({color}) => {
        return <Icon as={MaterialIcons} name={iconName} color={color} />;
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
  }
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name={TabRoutes.INPUTS} component={ProjectInputTab} />
      <Tab.Screen
        name={TabRoutes.TEAM}
        component={ProjectTeamTab}
        initialParams={{users: USER_PROFILES}}
      />
    </Tab.Navigator>
  );
}
