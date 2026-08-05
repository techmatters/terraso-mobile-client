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

import {
  createContext,
  memo,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {Site} from 'terraso-client-shared/site/siteTypes';

import {useSelector} from 'terraso-mobile-client/store';

type PendingCalloutSiteId = string | null;

type PendingSiteCalloutContextValue = {
  pendingCalloutSiteId: PendingCalloutSiteId;
  setPendingCalloutSiteId: (siteId: PendingCalloutSiteId) => void;
};

const PendingSiteCalloutContext =
  createContext<PendingSiteCalloutContextValue | null>(null);

/* Lives above the navigator because the requesting and consuming screens are siblings in the root stack, so this is their nearest common ancestor. */
export const PendingSiteCalloutProvider = memo(
  ({children}: React.PropsWithChildren<{}>) => {
    const [pendingCalloutSiteId, setPendingCalloutSiteId] = useState<
      string | null
    >(null);
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

const usePendingSiteCalloutContext = () => {
  const context = useContext(PendingSiteCalloutContext);
  if (context === null) {
    throw new Error(
      'Pending site callout hooks must be used within a PendingSiteCalloutProvider',
    );
  }
  return context;
};

/* Asks whoever consumes the request to open a site's map callout, once they next render. Deliberately a value the consumer pulls rather than a callback it registers: react-freeze suspends screens more than one level below the focused one and React tears down their effects, so anything a screen publishes outward goes missing exactly when another screen needs it. */
export const useRequestSiteCallout = (): ((siteId: string) => void) =>
  usePendingSiteCalloutContext().setPendingCalloutSiteId;

/* Runs `showSite` for a site requested via `useRequestSiteCallout`, then drops the request so it can't fire twice. */
export const useConsumePendingSiteCallout = (
  showSite: (site: Site) => void,
) => {
  const {pendingCalloutSiteId, setPendingCalloutSiteId} =
    usePendingSiteCalloutContext();
  const pendingSite = useSelector(state =>
    pendingCalloutSiteId === null
      ? undefined
      : state.site.sites[pendingCalloutSiteId],
  );

  useEffect(() => {
    if (pendingCalloutSiteId === null) {
      return;
    }
    if (pendingSite === undefined) {
      /* Requests are only made for sites already written to the store, so a miss means the site was deleted in between — nothing to show, so drop the request. */
      console.warn(
        `No site found for pending callout site id ${pendingCalloutSiteId}`,
      );
    } else {
      showSite(pendingSite);
    }
    setPendingCalloutSiteId(null);
  }, [pendingCalloutSiteId, pendingSite, setPendingCalloutSiteId, showSite]);
};
