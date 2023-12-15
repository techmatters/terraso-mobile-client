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

import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {useEffect} from 'react';
import {useTranslation} from 'react-i18next';
import {Location, locationManager} from '@rnmapbox/maps';

import {
  setHasAccessTokenAsync,
  fetchUser,
} from 'terraso-client-shared/account/accountSlice';
import {updateLocation} from 'terraso-mobile-client/model/map/mapSlice';
import {USER_DISPLACEMENT_MIN_DISTANCE_M} from 'terraso-mobile-client/constants';

import {LoginScreen} from 'terraso-mobile-client/screens/LoginScreen';
import {BottomTabNavigator} from 'terraso-mobile-client/navigation/navigators/BottomTabNavigator';
import {ProjectTabNavigator} from 'terraso-mobile-client/navigation/navigators/ProjectTabNavigator';
import {LocationDashboardTabNavigator} from 'terraso-mobile-client/navigation/navigators/LocationDashboardTabNavigator';
import {CreateSiteScreen} from 'terraso-mobile-client/screens/CreateSiteScreen/CreateSiteScreen';
import {useTheme} from 'native-base';
import {CreateProjectScreen} from 'terraso-mobile-client/screens/CreateProjectScreen/CreateProjectScreen';
import {SiteSettingsScreen} from 'terraso-mobile-client/screens/SiteSettingsScreen/SiteSettingsScreen';
import {SiteTransferProjectScreen} from 'terraso-mobile-client/screens/SiteTransferProjectScreen/SiteTransferProjectScreen';
import {AppBarIconButton} from 'terraso-mobile-client/navigation/components/AppBarIconButton';
import {AddSiteNoteScreen} from 'terraso-mobile-client/screens/AddSiteNoteScreen';
import {EditSiteNoteScreen} from 'terraso-mobile-client/screens/EditSiteNoteScreen';
import {EditProjectInstructionsScreen} from 'terraso-mobile-client/screens/EditProjectInstructionsScreen';
import {ReadNoteScreen} from 'terraso-mobile-client/screens/ReadNoteScreen';
import {RootNavigatorScreens} from 'terraso-mobile-client/navigation/types';
import {RootNavigatorParamList} from 'terraso-mobile-client/navigation/types';
import {ManageTeamMemberScreen} from 'terraso-mobile-client/screens/ManageTeamMemberScreen';
import {AddUserToProjectScreen} from 'terraso-mobile-client/screens/AddUserToProjectScreen/AddUserToProjectScreen';

const Stack = createNativeStackNavigator<RootNavigatorParamList>();

export const RootNavigator = () => {
  const {colors} = useTheme();
  const {t} = useTranslation();

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
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary.main,
        },
        headerBackTitle: t('screens.BACK_BUTTON'),
        headerTintColor: colors.white,
        headerTitleStyle: {
          fontSize: 20,
        },
      }}>
      {isLoggedIn ? (
        <>
          <Stack.Screen
            name={RootNavigatorScreens.BOTTOM_TABS}
            component={BottomTabNavigator}
            options={{headerShown: false}}
          />
          <Stack.Screen
            name={RootNavigatorScreens.PROJECT_TABS}
            component={ProjectTabNavigator}
            options={({route}) => ({
              title: t(`screens.${RootNavigatorScreens.PROJECT_TABS}`, {
                id: route.params.projectId,
              }),
            })}
          />
          <Stack.Screen
            name={RootNavigatorScreens.LOCATION_DASHBOARD_TABS}
            component={LocationDashboardTabNavigator}
            options={({navigation, route: {params}}) => ({
              title: t(
                `screens.${RootNavigatorScreens.LOCATION_DASHBOARD_TABS}`,
              ),
              headerRight: () =>
                'siteId' in params ? (
                  <AppBarIconButton
                    name="settings"
                    onPress={() =>
                      navigation.navigate(RootNavigatorScreens.SITE_SETTINGS, {
                        siteId: params.siteId,
                      })
                    }
                  />
                ) : (
                  <AppBarIconButton
                    name="add"
                    onPress={() =>
                      navigation.navigate(RootNavigatorScreens.CREATE_SITE, {
                        coords: params.coords,
                      })
                    }
                  />
                ),
            })}
          />
          <Stack.Screen
            name={RootNavigatorScreens.CREATE_SITE}
            component={CreateSiteScreen}
            options={{
              title: t(`screens.${RootNavigatorScreens.CREATE_SITE}`),
            }}
          />
          <Stack.Screen
            name={RootNavigatorScreens.CREATE_PROJECT}
            component={CreateProjectScreen}
            options={{
              title: t(`screens.${RootNavigatorScreens.CREATE_PROJECT}`),
            }}
          />
          <Stack.Screen
            name={RootNavigatorScreens.SITE_SETTINGS}
            component={SiteSettingsScreen}
            options={{
              title: t(`screens.${RootNavigatorScreens.SITE_SETTINGS}`),
            }}
          />
          <Stack.Screen
            name={RootNavigatorScreens.SITE_TRANSFER_PROJECT}
            component={SiteTransferProjectScreen}
            options={({route}) => ({
              title: t(
                `screens.${RootNavigatorScreens.SITE_TRANSFER_PROJECT}`,
                {
                  id: route.params?.projectId,
                },
              ),
            })}
          />
          <Stack.Screen
            name={RootNavigatorScreens.MANAGE_TEAM_MEMBER}
            component={ManageTeamMemberScreen}
            options={{
              title: t(`screens.${RootNavigatorScreens.MANAGE_TEAM_MEMBER}`),
            }}
          />
          <Stack.Screen
            name={RootNavigatorScreens.ADD_USER_PROJECT}
            component={AddUserToProjectScreen}
            options={{
              title: t(`screens.${RootNavigatorScreens.ADD_USER_PROJECT}`),
            }}
          />
          <Stack.Group
            screenOptions={{
              presentation: 'modal',
            }}>
            <Stack.Screen
              name={RootNavigatorScreens.ADD_SITE_NOTE}
              component={AddSiteNoteScreen}
              options={{
                title: t(`screens.${RootNavigatorScreens.ADD_SITE_NOTE}`),
              }}
            />
            <Stack.Screen
              name={RootNavigatorScreens.EDIT_SITE_NOTE}
              component={EditSiteNoteScreen}
              options={{
                title: t(`screens.${RootNavigatorScreens.EDIT_SITE_NOTE}`),
              }}
            />
            <Stack.Screen
              name={RootNavigatorScreens.READ_NOTE}
              component={ReadNoteScreen}
              options={{
                title: t(`screens.${RootNavigatorScreens.READ_NOTE}`),
              }}
            />
            <Stack.Screen
              name={RootNavigatorScreens.EDIT_PROJECT_INSTRUCTIONS}
              component={EditProjectInstructionsScreen}
              options={{
                title: t(
                  `screens.${RootNavigatorScreens.EDIT_PROJECT_INSTRUCTIONS}`,
                ),
              }}
            />
          </Stack.Group>
        </>
      ) : (
        <Stack.Screen
          name={RootNavigatorScreens.LOGIN}
          component={LoginScreen}
          options={{
            animationTypeForReplace: 'pop',
            headerShown: false,
          }}
        />
      )}
    </Stack.Navigator>
  );
};
