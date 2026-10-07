/*
 * Copyright © 2026 Technology Matters
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

import {kvStorage} from 'terraso-mobile-client/persistence/kvStorage';

/* Groups every seen record under one namespace so they read as a set in KvStorageEditor. Callers supply the rest of the key. Named for the revision number actually stored rather than for `seen`, which would read as a boolean. Exported so KvStorageEditor can type these rows without duplicating the literal. */
export const SEEN_KEY_PREFIX = 'seenRevision.';

/*
 * Tracks whether the user has already seen a one-time affordance, at a given revision.
 * Bumping the revision re-arms it for users who only saw an older one.
 *
 * The record is local-only (see kvStorage): it is a UI hint rather than user data, so a
 * reinstall replaying the affordance is an acceptable trade for working offline with no
 * backend surface.
 *
 * Caller decides when markSeen should fire.
 */
export const useSeenOnce = (key: string, revision: number) => {
  const [seenRevision, setSeenRevision] = kvStorage.useNumber(
    SEEN_KEY_PREFIX + key,
    0,
  );

  const markSeen = useCallback(
    () => setSeenRevision(revision),
    [setSeenRevision, revision],
  );

  return {seen: seenRevision >= revision, markSeen};
};
