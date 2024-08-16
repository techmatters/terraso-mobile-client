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
import {memo, useCallback, useEffect} from 'react';
import {useTranslation} from 'react-i18next';

import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {NavigationHelpers} from '@react-navigation/native';

import {Row} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {BottomNavButton} from 'terraso-mobile-client/navigation/components/BottomNavButton';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {BottomTabsParamList} from 'terraso-mobile-client/navigation/types';
import {useSelector} from 'terraso-mobile-client/store';

export const BottomTabs = createBottomTabNavigator<BottomTabsParamList>();

export const BottomNavigator = memo(
  ({navigation}: {navigation: NavigationHelpers<BottomTabsParamList>}) => {
    const {t} = useTranslation();
    const stackNavigation = useNavigation();
    const loggedIn = useSelector(
      state => state.account.currentUser.data !== null,
    );

    const onSites = useCallback(
      () => navigation.navigate('HOME'),
      [navigation],
    );

    const onProject = useCallback(
      () => navigation.navigate('PROJECT_LIST'),
      [navigation],
    );

    const onSettings = useCallback(
      () => navigation.navigate('SETTINGS'),
      [navigation],
    );

    useEffect(() => {
      if (!loggedIn) {
        stackNavigation.navigate('LOGIN');
      }
    }, [loggedIn, stackNavigation]);

    return (
      <Row bg="primary.main" justifyContent="space-around" pb={2}>
        <BottomNavButton
          name="location-pin"
          label={t('bottom_navigation.sites')}
          onPress={onSites}
        />
        <BottomNavButton
          name="work"
          label={t('bottom_navigation.projects')}
          onPress={onProject}
        />
        <BottomNavButton
          name="settings"
          label={t('bottom_navigation.settings')}
          onPress={onSettings}
        />
      </Row>
    );
  },
);
