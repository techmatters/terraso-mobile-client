import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import ProjectInputTab from './ProjectInputTab';
import {Box} from 'native-base';

const Tab = createMaterialTopTabNavigator();

export default function ProjectTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Inputs" component={ProjectInputTab} />
    </Tab.Navigator>
  );
}
