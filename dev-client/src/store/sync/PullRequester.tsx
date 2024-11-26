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

import {useEffect, useRef} from 'react';

import _ from 'lodash';

import {setPullRequested} from 'terraso-mobile-client/model/sync/syncSlice';
import {useDispatch} from 'terraso-mobile-client/store';
import {
  useDebouncedIsOffline,
  useSyncErrorSiteIds,
} from 'terraso-mobile-client/store/sync/hooks/syncHooks';

// Pull every 5 minutes
export const PULL_INTERVAL_MS = 1000 * 60 * 5;
export const OFFLINE_DEBOUNCE_MS = 500;

export const PullRequester = () => {
  const dispatch = useDispatch();
  // Request a pull when app starts
  useEffect(() => {
    // TODO-cknipe: Remove all the console.logs
    console.log(
      'Requesting pull on app start -- hopefully this only happens once??',
    );

    dispatch(setPullRequested(true));
  }, [dispatch]);

  // Request a pull when we come online
  const isOffline = useDebouncedIsOffline(OFFLINE_DEBOUNCE_MS);
  const wasPreviouslyOffline = useRef<boolean>(
    // TODO-cknipe: Remove this once garo makes isOffline a boolean
    isOffline === null ? true : isOffline,
  );
  useEffect(() => {
    if (isOffline === false && isOffline !== wasPreviouslyOffline.current) {
      console.log('Requesting pull via offline');
      dispatch(setPullRequested(true));
      wasPreviouslyOffline.current = isOffline;
    }
  }, [isOffline, dispatch]);

  // Request a pull when most recent push yielded errors
  const sitesWithErrors = useSyncErrorSiteIds();
  useEffect(() => {
    if (!_.isEmpty(sitesWithErrors)) {
      console.log('Requesting pull via sitesWithErrors');
      dispatch(setPullRequested(true));
    }
  }, [sitesWithErrors, dispatch]);

  // Request a pull at regular intervals
  // FYI intervals just keep running even if app in background or if a pull errors, etc.
  const intervalIdRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    intervalIdRef.current = setInterval(() => {
      console.log('Requesting pull via interval');
      dispatch(setPullRequested(true));
    }, PULL_INTERVAL_MS);
    return () => {
      if (intervalIdRef.current !== undefined) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = undefined;
      }
    };
  }, [dispatch]);

  return <></>;
};
