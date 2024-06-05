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

import {Site} from 'terraso-client-shared/site/siteSlice';

type HomeScreenRef = {
  showSiteOnMap: (site: Site) => void;
  collapseBottomSheet: () => void;
};

const HomeScreenContext = createContext<RefObject<HomeScreenRef> | null>(null);

export const HomeScreenContextProvider = memo(
  ({children}: React.PropsWithChildren<{}>) => (
    <HomeScreenContext.Provider value={useRef<HomeScreenRef>(null)}>
      {children}
    </HomeScreenContext.Provider>
  ),
);

export const useHomeScreenContext = () =>
  useContext(HomeScreenContext)?.current ?? undefined;
