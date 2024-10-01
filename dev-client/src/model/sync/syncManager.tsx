import {useEffect} from 'react';

import {useDebounce} from 'use-debounce';

import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {selectUnsyncedSiteIds} from 'terraso-mobile-client/model/soilId/soilIdSelectors';
import {syncSoilDataForUser} from 'terraso-mobile-client/model/soilId/soilIdSlice';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

export const SyncManager = ({children}: React.PropsWithChildren) => {
  const dispatch = useDispatch();
  const isOffline = useIsOffline();
  const unsyncedIds = useSelector(selectUnsyncedSiteIds);

  /* Debounce both offline state and IDs so we don't queue up too many syncs at once */
  const [debouncedOffline] = useDebounce(isOffline, 500);
  const [debouncedIds] = useDebounce(unsyncedIds, 500);

  useEffect(() => {
    console.log(`SyncManager isOffline: ${debouncedOffline}`);
    console.log(`SyncManager unsyncedIds: ${debouncedIds.length}`);

    /* If we're not offline and have unsynced site IDs, dispatch a sync all for them */
    if (!debouncedOffline && debouncedIds.length > 0) {
      console.log('syncing');
      dispatch(syncSoilDataForUser(debouncedIds));
    }
  }, [dispatch, debouncedOffline, debouncedIds]);

  return <>{children}</>;
};
