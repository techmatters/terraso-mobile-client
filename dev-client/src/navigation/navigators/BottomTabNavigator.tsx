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

import {HomeScreen} from 'terraso-mobile-client/screens/HomeScreen/HomeScreen';
import {ProjectListScreen} from 'terraso-mobile-client/screens/ProjectListScreen/ProjectListScreen';
import {SettingsScreen} from 'terraso-mobile-client/screens/SettingsScreen';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useTheme} from 'native-base';
import {AppBarIconButton} from 'terraso-mobile-client/navigation/components/AppBarIconButton';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {useDispatch} from 'terraso-mobile-client/store';
import {signOut} from 'terraso-client-shared/account/accountSlice';
import {Icon} from 'terraso-mobile-client/components/Icons';
import {MaterialCommunityIcons} from 'terraso-mobile-client/components/Icons';
import {Pressable} from 'react-native';
import {useTranslation} from 'react-i18next';
import {ConfirmModal} from 'terraso-mobile-client/components/ConfirmModal';
import {
  BottomTabNavigatorScreens,
  BottomTabNavigatorParamList,
} from 'terraso-mobile-client/navigation/types';

const Tab = createBottomTabNavigator<BottomTabNavigatorParamList>();

export const BottomTabNavigator = () => {
  const {colors} = useTheme();
  const {t} = useTranslation();
  const dispatch = useDispatch();

  return (
    <BottomSheetModalProvider>
      <Tab.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.primary.main,
          },
          headerTintColor: colors.white,
          headerTitleStyle: {
            fontSize: 20,
          },
          tabBarStyle: {
            backgroundColor: colors.primary.main,
          },
          tabBarActiveTintColor: colors.primary.contrast,
          tabBarInactiveTintColor: colors.gray[400],
          tabBarLabelStyle: {
            fontSize: 12,
          },
        }}>
        <Tab.Screen
          name={BottomTabNavigatorScreens.HOME}
          component={HomeScreen}
          options={{
            headerTitle: t('screens.HOME'),
            headerRight: () => <AppBarIconButton name="info" />,
            tabBarLabel: t('bottom_navigation.home'),
            tabBarIcon: () => (
              <Icon name="location-pin" color="primary.contrast" />
            ),
          }}
        />
        <Tab.Screen
          name={BottomTabNavigatorScreens.PROJECT_LIST}
          component={ProjectListScreen}
          options={{
            headerTitle: t('screens.PROJECT_LIST'),
            tabBarLabel: t('bottom_navigation.projects'),
            tabBarIcon: () => (
              <Icon
                as={MaterialCommunityIcons}
                name="briefcase"
                color="primary.contrast"
              />
            ),
          }}
        />
        <Tab.Screen
          name={BottomTabNavigatorScreens.SETTINGS}
          component={SettingsScreen}
          options={{
            headerTitle: t('screens.SETTINGS'),
            tabBarLabel: t('bottom_navigation.settings'),
            tabBarIcon: () => <Icon name="settings" color="primary.contrast" />,
          }}
        />
        <Tab.Screen
          name={BottomTabNavigatorScreens.SIGN_OUT}
          listeners={{
            tabPress: e => {
              e.preventDefault();
            },
          }}
          options={{
            tabBarLabel: t('bottom_navigation.sign_out'),
            tabBarIcon: () => <Icon name="logout" color="primary.contrast" />,
            tabBarButton: props => (
              <ConfirmModal // TODO: It works, but is unnecessarily complicated and should be simplified later on
                trigger={onOpen => (
                  <Pressable
                    {...props}
                    onPress={e => {
                      props.onPress?.(e);
                      onOpen();
                    }}
                  />
                )}
                title={t('logout.confirm_title')}
                body={t('logout.confirm_body')}
                actionName={t('logout.confirm_action')}
                handleConfirm={() => dispatch(signOut())}
              />
            ),
          }}>
          {/* Not rendering any screen/component under 'Sign Out' as we use this route just for logging out */}
          {() => null}
        </Tab.Screen>
      </Tab.Navigator>
    </BottomSheetModalProvider>
  );
};
