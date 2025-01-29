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
import {Portal, Snackbar} from 'react-native-paper';

import {removeMessage} from 'terraso-client-shared/notifications/notificationsSlice';

import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

// Does not currently support a queue of notifications

// const AUTO_HIDE_DURATION = 10000;

// TODO-cknipe: What if the "error saving soil id" happens too?? How does this play w Toast?
export const ErrorNotifications = () => {
  const dispatch = useDispatch();
  const isOffline = useIsOffline();

  // Get the messages from the notification slice
  const messages = useSelector(state => state.notifications.messages);

  console.log('--------------------');
  for (const messageKey in messages) {
    console.log('MESSAGE: ', messages[messageKey]);
  }
  console.log('--------------------');

  // OPTION 1: Assume just 1 snackbar at a time
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
      // TODO-cknipe: Actual stringify
      setSnackbarMessage("Can't OFFLINE");
    }

    errorMessages.forEach(messageKey => {
      dispatch(removeMessage(messageKey));
    });
  }, [messages, isOffline, dispatch]);

  console.log('SNACKBAR:', snackbarMessage);

  return (
    <Portal>
      <Snackbar visible={snackbarMessage !== null} onDismiss={onDismiss}>
        {snackbarMessage}
      </Snackbar>
    </Portal>
  );
};
