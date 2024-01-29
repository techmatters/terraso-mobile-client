import {memo} from 'react';
import {
  BottomNavigator,
  BottomTabs,
} from 'terraso-mobile-client/navigation/navigators/BottomNavigator';
import {NavigationHelpers} from '@react-navigation/native';
import {BottomTabsParamList} from 'terraso-mobile-client/navigation/types';
import {HomeScreen} from 'terraso-mobile-client/screens/HomeScreen/HomeScreen';
import {ProjectListScreen} from 'terraso-mobile-client/screens/ProjectListScreen/ProjectListScreen';

/*
 * Copyright © 2024 Technology Matters
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see https://www.gnu.org/licenses/.
 */

export const BottomTabsScreen = memo(() => {
  return (
    <BottomTabs.Navigator
      tabBar={props => (
        <BottomNavigator
          navigation={
            props.navigation as NavigationHelpers<BottomTabsParamList>
          }
        />
      )}
      screenOptions={{headerShown: false}}>
      <BottomTabs.Screen name="HOME" component={HomeScreen} />
      <BottomTabs.Screen name="PROJECT_LIST" component={ProjectListScreen} />
    </BottomTabs.Navigator>
  );
});
