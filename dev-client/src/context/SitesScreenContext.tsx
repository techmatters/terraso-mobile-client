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
  memo,
  RefObject,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

type SitesScreenRef = {
  collapseBottomSheet: () => void;
};

export const SitesScreenContext =
  createContext<RefObject<SitesScreenRef | null> | null>(null);

type PendingSiteCallout = {
  pendingCalloutSiteId: string | null;
  setPendingCalloutSiteId: (siteId: string | null) => void;
};

const PendingSiteCalloutContext = createContext<PendingSiteCallout | null>(
  null,
);

export const SitesScreenContextProvider = memo(
  ({children}: React.PropsWithChildren<{}>) => {
    const [pendingCalloutSiteId, setPendingCalloutSiteId] = useState<
      string | null
    >(null);
    const pendingSiteCallout = useMemo(
      () => ({pendingCalloutSiteId, setPendingCalloutSiteId}),
      [pendingCalloutSiteId],
    );

    return (
      <SitesScreenContext.Provider value={useRef<SitesScreenRef>(null)}>
        <PendingSiteCalloutContext.Provider value={pendingSiteCallout}>
          {children}
        </PendingSiteCalloutContext.Provider>
      </SitesScreenContext.Provider>
    );
  },
);

/* Only safe to call from within SitesScreen's own subtree: the ref is populated by a layout effect in SitesScreen, and React tears those down whenever the screen is frozen by react-freeze (any screen more than one level above it in the stack). From a different screen this silently returns undefined — use usePendingSiteCallout instead. */
export const useSitesScreenContext = () =>
  useContext(SitesScreenContext)?.current ?? undefined;

/* Cross-screen request to open a site's map callout. Lives above the navigator so it survives screen freezing; SitesScreen consumes and clears it once it renders again. */
export const usePendingSiteCallout = () => {
  const context = useContext(PendingSiteCalloutContext);
  if (context === null) {
    throw new Error(
      'usePendingSiteCallout must be used within a SitesScreenContextProvider',
    );
  }
  return context;
};
