import {useContext, useEffect} from 'react';

import {useDebounce} from 'use-debounce';

import {ConnectivityContext} from 'terraso-mobile-client/context/connectivity/ConnectivityContext';
import {selectUnsyncedSiteIds} from 'terraso-mobile-client/model/soilId/soilIdSelectors';
import {syncSoilDataForUser} from 'terraso-mobile-client/model/soilId/soilIdSlice';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

export const SyncManager = ({children}: React.PropsWithChildren) => {
  const dispatch = useDispatch();
  const isOffline = useContext(ConnectivityContext);
  const unsyncedIds = useSelector(selectUnsyncedSiteIds);

  /* Determine the sync situation -- combination of offline state and IDs in need of syncing */
  const [debouncedSituation] = useDebounce(
    {
      isOffline,
      unsyncedIds,
    },
    500,
  );

  useEffect(() => {
    /* If we're not offline and have unsynced site IDs, dispatch a sync all for them */
    if (!debouncedSituation.isOffline && debouncedSituation.unsyncedIds) {
      dispatch(syncSoilDataForUser(debouncedSituation.unsyncedIds));
    }
  }, [dispatch, debouncedSituation]);

  return <>{children}</>;
};
