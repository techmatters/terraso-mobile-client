/*
 * Copyright © 2025 Technology Matters
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

import React, {createContext, ReactNode, useContext, useState} from 'react';

import {SiteTabName} from 'terraso-mobile-client/navigation/navigators/SiteTabNavigator';

type SiteTabJumpContextType = {
  nextSiteTab: SiteTabName | null;
  setNextSiteTab: (tab: SiteTabName | null) => void;
};

// Create the context (null initially)
const SiteTabJumpContext = createContext<SiteTabJumpContextType | null>(null);

// Provider component
export function SiteTabJumpProvider({children}: {children: ReactNode}) {
  const [nextSiteTab, setNextSiteTab] = useState<SiteTabName | null>(null);

  return (
    <SiteTabJumpContext.Provider value={{nextSiteTab, setNextSiteTab}}>
      {children}
    </SiteTabJumpContext.Provider>
  );
}

// A convenience hook so you don’t repeat `useContext`
export function useSiteTabJumpContext() {
  const ctx = useContext(SiteTabJumpContext);
  if (!ctx) {
    throw new Error(
      'useSiteTabJumpContext must be used inside a SiteTabJumpContext',
    );
  }
  return ctx;
}
