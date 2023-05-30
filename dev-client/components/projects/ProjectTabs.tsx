import {
  MaterialTopTabNavigationOptions,
  createMaterialTopTabNavigator,
} from '@react-navigation/material-top-tabs';
import ProjectInputTab from './ProjectInputTab';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {Icon, useTheme} from 'native-base';
import {RouteProp} from '@react-navigation/native';

export const enum TabRoutes {
  INPUTS = 'Inputs',
}

export type TabStackParamList = {
  [TabRoutes.INPUTS]: undefined;
};

const Tab = createMaterialTopTabNavigator<TabStackParamList>();

// TODO: There must be a better way
type TabRouteProp = {route: RouteProp<TabStackParamList, TabRoutes.INPUTS>};

export default function ProjectTabs() {
  const {colors} = useTheme(); //TODO: Is it better to use useToken?

  function screenOptions({
    route,
  }: TabRouteProp): MaterialTopTabNavigationOptions {
    let iconName = 'tune';
    switch (route.name) {
      case 'Inputs':
        iconName = 'tune';
        break;
    }

    return {
      tabBarIcon: ({color}) => {
        return <Icon as={MaterialIcons} name={iconName} color={color} />;
      },
      tabBarActiveTintColor: colors.primary.contrast,
      tabBarInactiveTintColor: colors.secondary.main,
      tabBarItemStyle: {width: 100, flexDirection: 'row'},
      tabBarStyle: {
        backgroundColor: colors.secondary.main,
      },
    };
  }
  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen name={TabRoutes.INPUTS} component={ProjectInputTab} />
    </Tab.Navigator>
  );
}
