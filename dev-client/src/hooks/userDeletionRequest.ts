import {useCallback, useState} from 'react';

import {savePreference} from 'terraso-client-shared/account/accountSlice';

import {useDispatch, useSelector} from 'terraso-mobile-client/store';

const PREFERENCES_KEY = 'account_deletion_request';
const PREFERENCES_VALUE = 'true';

export const useUserDeletionRequests = () => {
  const dispatch = useDispatch();
  const {data: user} = useSelector(state => state.account.currentUser);
  const [isPending, setIsPending] = useState(
    user!.preferences[PREFERENCES_KEY] === PREFERENCES_VALUE,
  );
  const requestDeletion = useCallback(() => {
    setIsPending(true);
    dispatch(savePreference({key: PREFERENCES_KEY, value: PREFERENCES_VALUE}));
  }, [dispatch]);

  return {user, isPending, requestDeletion};
};
