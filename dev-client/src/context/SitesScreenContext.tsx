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

import {createContext, memo, RefObject, useContext, useRef} from 'react';

import {Site} from 'terraso-client-shared/site/siteTypes';

type SitesScreenRef = {
  showSiteOnMap: (site: Site) => void;
  collapseBottomSheet: () => void;
};

export const SitesScreenContext =
  createContext<RefObject<SitesScreenRef> | null>(null);

export const SitesScreenContextProvider = memo(
  ({children}: React.PropsWithChildren<{}>) => (
    <SitesScreenContext.Provider value={useRef<SitesScreenRef>(null)}>
      {children}
    </SitesScreenContext.Provider>
  ),
);

export const useSitesScreenContext = () =>
  useContext(SitesScreenContext)?.current ?? undefined;
