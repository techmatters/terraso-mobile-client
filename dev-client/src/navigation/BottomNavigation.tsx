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

import {Row} from 'native-base';
import {MaterialCommunityIcons} from 'terraso-mobile-client/components/common/Icons';
import {useCallback, useEffect} from 'react';
import {useDispatch, useSelector} from 'terraso-mobile-client/model/store';
import {useTranslation} from 'react-i18next';
import {useNavigation} from 'terraso-mobile-client/navigation/useNavigation';
import ConfirmModal from 'terraso-mobile-client/components/common/ConfirmModal';
import {signOut} from 'terraso-client-shared/account/accountSlice';
import {BottomNavIconButton} from 'terraso-mobile-client/navigation/buttons/BottomNavIconButton';

export const BottomNavigation = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const loggedIn = useSelector(
    state => state.account.currentUser.data !== null,
  );

  const onHome = useCallback(
    () => navigation.navigate('HOME', {}),
    [navigation],
  );

  const onProject = useCallback(
    () => navigation.navigate('PROJECT_LIST'),
    [navigation],
  );

  const onLogout = useCallback(() => {
    dispatch(signOut());
  }, [dispatch]);

  useEffect(() => {
    if (!loggedIn) {
      navigation.navigate('LOGIN');
    }
  }, [loggedIn, navigation]);

  return (
    <Row bg="primary.main" justifyContent="center" space={10} pb={2}>
      <BottomNavIconButton
        name="location-pin"
        label={t('bottom_navigation.home')}
        onPress={onHome}
      />
      <BottomNavIconButton
        as={MaterialCommunityIcons}
        name="briefcase"
        label={t('bottom_navigation.projects')}
        onPress={onProject}
      />
      <BottomNavIconButton
        name="settings"
        label={t('bottom_navigation.settings')}
      />
      <ConfirmModal
        trigger={onOpen => (
          <BottomNavIconButton
            name="logout"
            label={t('bottom_navigation.sign_out')}
            onPress={onOpen}
          />
        )}
        title={t('logout.confirm_title')}
        body={t('logout.confirm_body')}
        actionName={t('logout.confirm_action')}
        handleConfirm={onLogout}
      />
    </Row>
  );
};
