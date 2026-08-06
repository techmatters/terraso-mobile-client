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

import {createContext, useContext} from 'react';

const CollapseBottomSheetContext = createContext<(() => void) | null>(null);

type Props = React.PropsWithChildren<{collapseBottomSheet: () => void}>;

export const CollapseBottomSheetProvider = ({
  collapseBottomSheet,
  children,
}: Props) => (
  <CollapseBottomSheetContext.Provider value={collapseBottomSheet}>
    {children}
  </CollapseBottomSheetContext.Provider>
);

/* Provided by SitesScreen for its own subtree — the map, the callout and the search box all collapse the site list as a side effect of what they do. */
export const useCollapseBottomSheet = () => {
  const collapseBottomSheet = useContext(CollapseBottomSheetContext);
  if (collapseBottomSheet === null) {
    throw new Error(
      'useCollapseBottomSheet must be used within SitesScreen, which provides it',
    );
  }
  return collapseBottomSheet;
};
