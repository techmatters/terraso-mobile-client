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

import {memo, useEffect} from 'react';

import {NavigationHelpers} from '@react-navigation/native';
import {Location, locationManager} from '@rnmapbox/maps';

import {USER_DISPLACEMENT_MIN_DISTANCE_M} from 'terraso-mobile-client/constants';
import {useUpdatedForegroundPermissions} from 'terraso-mobile-client/hooks/appPermissionsHooks';
import {useKeyboardStatus} from 'terraso-mobile-client/hooks/useKeyboardStatus';
import {updateLocation} from 'terraso-mobile-client/model/map/mapSlice';
import {
  BottomNavigator,
  BottomTabs,
} from 'terraso-mobile-client/navigation/navigators/BottomNavigator';
import {BottomTabsParamList} from 'terraso-mobile-client/navigation/types';
import {ProjectListScreen} from 'terraso-mobile-client/screens/ProjectListScreen/ProjectListScreen';
import {SitesScreen} from 'terraso-mobile-client/screens/SitesScreen/SitesScreen';
import {UserSettingsScreen} from 'terraso-mobile-client/screens/UserSettingsScreen/UserSettingsScreen';
import {useDispatch} from 'terraso-mobile-client/store';

export const BottomTabsScreen = memo(() => {
  const dispatch = useDispatch();
  const {keyboardStatus} = useKeyboardStatus();
  const {
    permissions: locationPermissions,
    request: requestLocationPermissions,
  } = useUpdatedForegroundPermissions();

  useEffect(() => {
    if (!locationPermissions?.granted) {
      requestLocationPermissions();
    }

    // disable depcheck because we only want to run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (locationPermissions?.granted) {
      locationManager
        .getLastKnownLocation()
        .then(initCoords => {
          if (initCoords !== null) {
            dispatch(
              updateLocation({
                coords: initCoords.coords,
                accuracyM: initCoords.coords.accuracy ?? null,
              }),
            );
          }
        })
        .catch(error => {
          console.warn('locationManager Error: ', error);
        });

      // add listener to update location on user movement
      const listener = ({coords}: Location) => {
        dispatch(
          updateLocation({
            coords: coords,
            accuracyM: coords.accuracy ?? null,
          }),
        );
      };

      locationManager.setMinDisplacement(USER_DISPLACEMENT_MIN_DISTANCE_M);
      locationManager.addListener(listener);

      return () => locationManager.removeListener(listener);
    }
  }, [dispatch, locationPermissions?.granted]);

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
      <BottomTabs.Screen name="SITES" component={SitesScreen} />
      <BottomTabs.Screen name="PROJECT_LIST" component={ProjectListScreen} />
      <BottomTabs.Screen name="SETTINGS" component={UserSettingsScreen} />
    </BottomTabs.Navigator>
  );
});
