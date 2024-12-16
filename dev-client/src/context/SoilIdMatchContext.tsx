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

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {AsyncThunkAction} from '@reduxjs/toolkit';
import {isEqual} from 'lodash';

import {SoilIdInputData} from 'terraso-client-shared/graphqlSchema/graphql';
import {Coords} from 'terraso-client-shared/types';

import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {useValueSet} from 'terraso-mobile-client/hooks/useValueSet';
import {selectUnsyncedSiteIds} from 'terraso-mobile-client/model/soilId/soilIdSelectors';
import {coordsKey} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';
import {
  selectDataBasedInputs,
  selectLocationBasedKeys,
  selectNextDataBasedInputs,
} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatchSelectors';
import {
  fetchLocationBasedSoilMatches,
  fetchSiteDataBasedSoilMatches,
  flushDataCacheErrors,
  flushLocationCache,
} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatchSlice';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

/**
 * Hook that exposes handles allowing components to indicate via side-effects that they require
 * actively-updated soil ID data for particular coords or site IDs. These handles *must* be called
 * via side-effect. The component must also call remove() in the side-effect's clean-up method.
 *
 * Active soil ID data are fetched when online as input parameters change; data-based matches are
 * re-loaded when inputs change due to synced user changes. Matches are retained when offline even
 * if inputs change.
 *
 * The data for active coords and sites are available for selection via the Redux slice.
 */
export const useActiveSoilIdData = () => useContext(ActiveSoilIdContext);

export type ActiveSoilIdDataHandles = {
  addCoords: (coords: Coords) => {remove: () => void};
  addSite: (siteId: string) => {remove: () => void};
};

const ActiveSoilIdContext = createContext<ActiveSoilIdDataHandles>({
  addCoords: () => {
    return {remove: () => {}};
  },
  addSite: () => {
    return {remove: () => {}};
  },
});

export const SoilIdMatchContextProvider = ({
  children,
}: React.PropsWithChildren) => {
  /* Track active site and coords from children */
  const activeCoords = useValueSet<Coords>();
  const activeSites = useValueSet<string>();

  /* One-time cache flush for when the user first comes online */
  useCacheFlushing();

  /* Dispatch fetches as needed for the active inputs */
  useCoordFetching(useCoordsToFetch(activeCoords.values));
  useSiteFetching(useSiteInputsToFetch(activeSites.values));

  /* Expose the handles to children */
  const handles = useMemo(() => {
    return {
      addCoords: activeCoords.add,
      addSite: activeSites.add,
    };
  }, [activeCoords, activeSites]);
  return (
    <ActiveSoilIdContext.Provider value={handles}>
      {children}
    </ActiveSoilIdContext.Provider>
  );
};

const useCacheFlushing = () => {
  const dispatch = useDispatch();
  const isOffline = useIsOffline();
  const [isFlushed, setIsFlushed] = useState(false);

  /*
   * To prevent excessive build-up of cache entries, we flush the location cache when the user
   * first comes online during an app session.
   */
  useEffect(() => {
    if (!isOffline && !isFlushed) {
      dispatch(flushLocationCache());
      dispatch(flushDataCacheErrors());
      setIsFlushed(true);
    }
  }, [dispatch, isOffline, isFlushed, setIsFlushed]);
};

const useCoordsToFetch = (coords: Coords[]) => {
  /* Look up the keys of already-fetched coordinates */
  const fetchedKeys = useSelector(state => selectLocationBasedKeys(state));

  /* Determine which ones are missing by comparing coords keys */
  return useMemo(() => {
    const fetchedKeysSet = new Set(fetchedKeys);
    return coords.filter(coord => !fetchedKeysSet.has(coordsKey(coord)));
  }, [fetchedKeys, coords]);
};

const useCoordFetching = (coords: Coords[]) => {
  /* Use a side-effect to dispatch fetch actions for necessary coordinates */
  const dispatch = useDispatch();
  const isOffline = useIsOffline();
  useEffect(() => {
    if (!isOffline) {
      for (const coord of coords) {
        dispatch(fetchLocationBasedSoilMatches(coord));
      }
    }
  }, [dispatch, isOffline, coords]);
};

const useSiteInputsToFetch = (siteIds: string[]) => {
  /* Select last-fetched and upcoming inputs for active sites */
  const fetchedInputs = useSelector(state =>
    selectDataBasedInputs(state, siteIds),
  );
  const nextInputs = useSelector(state =>
    selectNextDataBasedInputs(state, siteIds),
  );

  /*
   * Select unsynced sites to exclude them from input.
   * (We don't load soil ID for unsynced sites, since the sync might further change soil data.)
   */
  const unsyncedSiteIds = useSelector(selectUnsyncedSiteIds);

  /* Determine the set of sites which need to be fetched because their inputs have changed */
  return useMemo(() => {
    const unsyncedSet = new Set(unsyncedSiteIds);
    return Object.fromEntries(
      siteIds
        .filter(siteId => {
          const fetchedInput = fetchedInputs[siteId];
          const nextInput = nextInputs[siteId];
          const isUnsynced = unsyncedSet.has(siteId);
          const inputChanged = nextInput && !isEqual(fetchedInput, nextInput);

          return inputChanged && !isUnsynced;
        })
        /* (Note: it's safe to use ! here; the filter() guarantees the nextInput is present) */
        .map(siteId => [siteId, nextInputs[siteId]!]),
    );
  }, [siteIds, fetchedInputs, nextInputs, unsyncedSiteIds]);
};

const useSiteFetching = (siteInputs: Record<string, SoilIdInputData>) => {
  /*
   * Use a side-effect to dispatch fetch actions for necessary sites. Since data changes may occur
   * between loads (e.g., user is changing site inputs), we keep a single active dispatch per site
   * and cancel prior in-flight ones.
   */
  const dispatch = usePerSiteDispatch();
  const isOffline = useIsOffline();
  useEffect(() => {
    if (!isOffline) {
      for (const [siteId, input] of Object.entries(siteInputs)) {
        if (input) {
          dispatch(siteId, fetchSiteDataBasedSoilMatches({siteId, input}));
        }
      }
    }
  }, [dispatch, isOffline, siteInputs]);
};

const usePerSiteDispatch = () => {
  /* Track all ongoing dispatches per site */
  type AbortableDispatch = {abort: (reason: string) => void};
  const siteDispatches = useRef({} as Record<string, AbortableDispatch>);

  const dispatch = useDispatch();
  const perSiteDispatch = useCallback(
    (siteId: string, action: AsyncThunkAction<any, any, any>) => {
      /* If there's an ongoing previous dispatch, abort it */
      const prevDispatch = siteDispatches.current[siteId];
      if (prevDispatch) {
        prevDispatch.abort('Input changed');
        delete siteDispatches.current[siteId];
      }

      /* Dispatch the new action */
      const newDispatch = dispatch(action);
      siteDispatches.current[siteId] = newDispatch;
    },
    [dispatch, siteDispatches],
  );

  return perSiteDispatch;
};
