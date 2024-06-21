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

import {useCallback} from 'react';

import {savePreference} from 'terraso-client-shared/account/accountSlice';

import {useDispatch, useSelector} from 'terraso-mobile-client/store';

const PREFERENCES_KEY = 'account_deletion_request';
const PREFERENCES_VALUE = 'true';

export const useUserDeletionRequests = () => {
  const dispatch = useDispatch();
  const {data: user} = useSelector(state => state.account.currentUser);
  const isSaving = useSelector(state => state.account.preferences.saving);
  const isPending = user?.preferences[PREFERENCES_KEY] === PREFERENCES_VALUE;

  const requestDeletion = useCallback(() => {
    dispatch(savePreference({key: PREFERENCES_KEY, value: PREFERENCES_VALUE}));
  }, [dispatch]);

  return {user, isPending, requestDeletion, isSaving};
};
