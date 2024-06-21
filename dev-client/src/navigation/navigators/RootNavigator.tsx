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

import {useEffect} from 'react';

import {NativeStackNavigationOptions} from '@react-navigation/native-stack';
import {Location, locationManager} from '@rnmapbox/maps';

import {
  fetchUser,
  setHasAccessTokenAsync,
} from 'terraso-client-shared/account/accountSlice';

import {USER_DISPLACEMENT_MIN_DISTANCE_M} from 'terraso-mobile-client/constants';
import {useStorage} from 'terraso-mobile-client/hooks/useStorage';
import {updateLocation} from 'terraso-mobile-client/model/map/mapSlice';
import {DEFAULT_STACK_NAVIGATOR_OPTIONS} from 'terraso-mobile-client/navigation/constants';
import {
  modalScreens,
  screens,
} from 'terraso-mobile-client/navigation/screenDefinitions';
import {RootStack} from 'terraso-mobile-client/navigation/types';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

const modalScreenOptions: NativeStackNavigationOptions = {
  ...DEFAULT_STACK_NAVIGATOR_OPTIONS,
  animation: 'slide_from_bottom',
};

export const RootNavigator = () => {
  const dispatch = useDispatch();
  const hasToken = useSelector(state => state.account.hasToken);
  const currentUser = useSelector(state => state.account.currentUser.data);
  const isLoggedIn = useSelector(
    state => state.account.currentUser.data !== null,
  );

  const [welcomeScreenAlreadySeen] = useStorage(
    'welcomeScreenAlreadySeen',
    false,
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

  // TODO-cknipe: REMOVE THIS
  console.log(
    `ROOT NAVIGATOR: MMVK ${welcomeScreenAlreadySeen} && isLoggedIn? ${isLoggedIn} && hasToken? ${hasToken}`,
  );

  return (
    <RootStack.Navigator
      initialRouteName={
        !welcomeScreenAlreadySeen
          ? 'WELCOME'
          : isLoggedIn
            ? 'BOTTOM_TABS'
            : 'LOGIN'
      }>
      <RootStack.Group screenOptions={DEFAULT_STACK_NAVIGATOR_OPTIONS}>
        {screens}
      </RootStack.Group>
      <RootStack.Group screenOptions={modalScreenOptions}>
        {modalScreens}
      </RootStack.Group>
    </RootStack.Navigator>
  );
};
