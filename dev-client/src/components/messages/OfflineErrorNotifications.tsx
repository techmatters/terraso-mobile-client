/*
 * Copyright © 2025 Technology Matters
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

import {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Portal, Snackbar} from 'react-native-paper';

import {
  Message,
  removeMessage,
} from 'terraso-client-shared/notifications/notificationsSlice';

import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

export const offlineProjectScreenMessage: Message = {
  severity: 'error',
  content: 'project-screen-accessed-offline',
};

export const OfflineErrorNotifications = () => {
  const dispatch = useDispatch();
  const isOffline = useIsOffline();
  const {t} = useTranslation();

  const messages = useSelector(state => state.notifications.messages);

  // Only supports 1 snackbar at a time; will not queue up snackbars
  const [showSnackbar, setShowSnackbar] = useState<boolean>(false);
  const onDismiss = () => setShowSnackbar(false);

  useEffect(() => {
    // Get error messages
    // If offline, show snackbar and delete all errors
    // If online, delete all errors silently
    // --> NOTE: Once we start actually handling errors, we should change this
    //     and have a more cohesive way of managing state.notifications.messages

    const errorMessages = Object.keys(messages).filter(
      messageKey => messages[messageKey].severity === 'error',
    );

    if (isOffline && errorMessages.length > 0) {
      setShowSnackbar(true);
    }
    if (!isOffline) {
      setShowSnackbar(false);
    }

    errorMessages.forEach(messageKey => {
      dispatch(removeMessage(messageKey));
    });
  }, [messages, isOffline, dispatch, t]);

  return (
    <Portal>
      <Snackbar
        visible={showSnackbar}
        onDismiss={onDismiss}
        onIconPress={onDismiss}
        duration={Infinity}>
        {t('general.offline_cant_edit')}
      </Snackbar>
    </Portal>
  );
};
