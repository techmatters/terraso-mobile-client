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

import {removeMessage} from 'terraso-client-shared/notifications/notificationsSlice';

import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

export const OfflineSnackbar = ({visible, onDismiss}: OfflineSnackbarProps) => {
  const {t} = useTranslation();

  return (
    <Snackbar
      visible={visible}
      onDismiss={onDismiss}
      onIconPress={onDismiss}
      duration={Snackbar.DURATION_LONG}>
      {t('general.offline_cant_edit')}
    </Snackbar>
  );
};

export const OfflineErrorNotifications = () => {
  const dispatch = useDispatch();
  const isOffline = useIsOffline();
  const {t} = useTranslation();

  const messages = useSelector(state => state.notifications.messages);

  // Only supports 1 snackbar at a time, even though it will delete all error messages
  // TODO: figure out how the mobile client should manage state.notifications.messages
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const onDismiss = () => setSnackbarMessage(null);

  useEffect(() => {
    // Get error messages
    // If offline, show snackbar and delete
    // If online, delete silently

    const errorMessages = Object.keys(messages).filter(
      messageKey => messages[messageKey].severity === 'error',
    );

    if (isOffline && errorMessages.length > 0) {
      setSnackbarMessage(t('general.offline_cant_edit'));
    }

    errorMessages.forEach(messageKey => {
      dispatch(removeMessage(messageKey));
    });
  }, [messages, isOffline, dispatch, t]);

  return (
    <Portal>
      <OfflineSnackbar
        visible={snackbarMessage !== null}
        onDismiss={onDismiss}
      />
    </Portal>
  );
};

type OfflineSnackbarProps = {
  visible: boolean;
  onDismiss: () => void;
};
