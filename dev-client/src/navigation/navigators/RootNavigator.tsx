/*
 * Copyright © 2023 Technology Matters
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

import {NativeStackNavigationOptions} from '@react-navigation/native-stack';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {useEffect} from 'react';
import {
  setHasAccessTokenAsync,
  fetchUser,
} from 'terraso-client-shared/account/accountSlice';
import {Location, locationManager} from '@rnmapbox/maps';
import {updateLocation} from 'terraso-mobile-client/model/map/mapSlice';
import {USER_DISPLACEMENT_MIN_DISTANCE_M} from 'terraso-mobile-client/constants';
import {RootStack} from 'terraso-mobile-client/navigation/types';
import {
  screens,
  modalScreens,
} from 'terraso-mobile-client/navigation/screenDefinitions';

const defaultScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  freezeOnBlur: true,
};
const modalScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
  animation: 'slide_from_bottom',
  freezeOnBlur: true,
};

export const RootNavigator = () => {
  const dispatch = useDispatch();
  const hasToken = useSelector(state => state.account.hasToken);
  const currentUser = useSelector(state => state.account.currentUser.data);
  const isLoggedIn = useSelector(
    state => state.account.currentUser.data !== null,
  );

  useEffect(() => {
    if (!hasToken) {
      dispatch(setHasAccessTokenAsync());
    }

    if (hasToken && currentUser === null) {
      dispatch(fetchUser());
    }
  }, [hasToken, currentUser, dispatch]);

  useEffect(() => {
    locationManager.getLastKnownLocation().then(initCoords => {
      if (initCoords !== null) {
        dispatch(
          updateLocation({
            coords: initCoords.coords,
            accuracyM: initCoords.coords.accuracy ?? null,
          }),
        );
      }
    });

    // add listener to update location on user movement
    const listener = ({coords}: Location) => {
      dispatch(
        updateLocation({coords: coords, accuracyM: coords.accuracy ?? null}),
      );
    };
    locationManager.setMinDisplacement(USER_DISPLACEMENT_MIN_DISTANCE_M);
    locationManager.addListener(listener);

    return () => locationManager.removeListener(listener);
  }, [dispatch]);

  return (
    <RootStack.Navigator
      initialRouteName={isLoggedIn ? 'BOTTOM_TABS' : 'LOGIN'}>
      <RootStack.Group screenOptions={defaultScreenOptions}>
        {screens}
      </RootStack.Group>
      <RootStack.Group screenOptions={modalScreenOptions}>
        {modalScreens}
      </RootStack.Group>
    </RootStack.Navigator>
  );
};
