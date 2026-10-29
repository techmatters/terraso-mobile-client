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

import {useCallback, useState} from 'react';

import {
  deleteUserAccount,
  isAccountDeletionPending,
  setAccountDeletedEmail,
  signOut,
  User,
} from 'terraso-client-shared/account/accountSlice';

import {getPostHogInstance} from 'terraso-mobile-client/app/posthog/posthogInstance';
import {DeleteAccountFeedback} from 'terraso-mobile-client/screens/DeleteAccountScreen/deleteAccountFeedback';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {userLoggedOut} from 'terraso-mobile-client/store/logoutActions';

/**
 * Hook backing the DeleteAccountScreen flow.
 *
 * `requestDeletion(feedback)` sends the user's optional feedback to PostHog
 * as `user_delete_feedback`, then fires the UserDeleteMutation. Feedback is
 * sent first so it's tied to the user before the clean path logs them out;
 * match it to the outcome via the backend's `user_delete_*` events.
 *
 * For the mutation, the backend either soft-deletes the account (clean
 * path) or routes to manual cleanup via a HubSpot ticket (blocked path;
 * backend sets the pending pref + files the ticket atomically).
 *
 * Clean path: dispatch userLoggedOut → signOut → setAccountDeletedEmail
 * in that order. userLoggedOut wipes state first; setAccountDeletedEmail
 * fires last so the LoginScreen sees the email and shows the
 * "Account deleted" modal.
 *
 * Blocked path: the thunk's fulfilled reducer flips the local pref so
 * `isPending` becomes true and the screen routes to the pending content.
 *
 * Error path (incl. HubSpot down on the blocked branch): the thunk
 * rejects; the app's standard error-toast machinery surfaces it.
 */
export const useUserDeletionRequests = () => {
  const dispatch = useDispatch();
  const {data: user} = useSelector(state => state.account.currentUser);
  const [isSaving, setIsSaving] = useState(false);
  const isPending = isAccountDeletionPending(user);

  const requestDeletion = useCallback(
    async (feedback: DeleteAccountFeedback) => {
      if (!user) return;
      captureDeletionFeedback(user, feedback);
      setIsSaving(true);
      try {
        const result = await dispatch(deleteUserAccount(user.id)).unwrap();
        if (result.kind === 'deleted') {
          dispatch(userLoggedOut());
          dispatch(signOut());
          dispatch(setAccountDeletedEmail(result.email));
        }
        // 'blocked' is handled by the thunk's fulfilled reducer (flips the
        // pref so DeleteAccountScreen re-renders the pending content).
      } finally {
        setIsSaving(false);
      }
    },
    [dispatch, user],
  );

  return {user, isPending, requestDeletion, isSaving};
};

const captureDeletionFeedback = (
  user: User,
  {reasons, details}: DeleteAccountFeedback,
) =>
  getPostHogInstance()?.capture('user_delete_feedback', {
    email: user.email,
    reasons,
    details,
  });
