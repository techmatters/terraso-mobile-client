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

import {memo, useLayoutEffect, useState} from 'react';
import {Keyboard} from 'react-native';

import {NavigationHelpers} from '@react-navigation/native';

import {
  BottomNavigator,
  BottomTabs,
} from 'terraso-mobile-client/navigation/navigators/BottomNavigator';
import {BottomTabsParamList} from 'terraso-mobile-client/navigation/types';
import {HomeScreen} from 'terraso-mobile-client/screens/HomeScreen/HomeScreen';
import {ProjectListScreen} from 'terraso-mobile-client/screens/ProjectListScreen/ProjectListScreen';
import {UserSettingsScreen} from 'terraso-mobile-client/screens/UserSettingsScreen/UserSettingsScreen';

export const BottomTabsScreen = memo(() => {
  const [keyboardStatus, setKeyboardStatus] = useState(false);

  useLayoutEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardStatus(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardStatus(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return (
    <BottomTabs.Navigator
      tabBar={props =>
        keyboardStatus ? (
          <></>
        ) : (
          <BottomNavigator
            navigation={
              props.navigation as NavigationHelpers<BottomTabsParamList>
            }
          />
        )
      }
      screenOptions={{headerShown: false, tabBarHideOnKeyboard: true}}>
      <BottomTabs.Screen name="HOME" component={HomeScreen} />
      <BottomTabs.Screen name="PROJECT_LIST" component={ProjectListScreen} />
      <BottomTabs.Screen name="SETTINGS" component={UserSettingsScreen} />
    </BottomTabs.Navigator>
  );
});
