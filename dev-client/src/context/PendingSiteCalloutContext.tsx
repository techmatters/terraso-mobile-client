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

/* Lets the site creation flow ask SitesScreen to open the new site's callout on the map, once the user lands back there. */

import {createContext, memo, useContext, useMemo, useState} from 'react';

type PendingCalloutSiteId = string | null;

type PendingSiteCalloutContextValue = {
  pendingCalloutSiteId: PendingCalloutSiteId;
  setPendingCalloutSiteId: (siteId: PendingCalloutSiteId) => void;
};

const PendingSiteCalloutContext =
  createContext<PendingSiteCalloutContextValue | null>(null);

/* Lives above the navigator because SitesScreen and the site creation screens are siblings in the root stack, so this is their nearest common ancestor. */
export const PendingSiteCalloutProvider = memo(
  ({children}: React.PropsWithChildren<{}>) => {
    const [pendingCalloutSiteId, setPendingCalloutSiteId] =
      useState<PendingCalloutSiteId>(null);
    const value = useMemo(
      () => ({pendingCalloutSiteId, setPendingCalloutSiteId}),
      [pendingCalloutSiteId],
    );

    return (
      <PendingSiteCalloutContext.Provider value={value}>
        {children}
      </PendingSiteCalloutContext.Provider>
    );
  },
);

/* A one-shot request to open the map callout for the site the user just created; SitesScreen reads it and clears it on its next render. Deliberately a value SitesScreen pulls rather than a callback it registers: react-freeze suspends screens more than one level below the focused one, and React tears down the effects of a suspended screen, so anything a screen publishes outward goes missing exactly when another screen needs it. */
export const usePendingSiteCallout = () => {
  const context = useContext(PendingSiteCalloutContext);
  if (context === null) {
    throw new Error(
      'usePendingSiteCallout must be used within a PendingSiteCalloutProvider',
    );
  }
  return context;
};
