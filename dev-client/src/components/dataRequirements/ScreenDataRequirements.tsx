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

import {useEffect, useMemo} from 'react';

type Requirement = {
  data: any;
  doIfMissing?: () => void;
};

const dataExists = (data: object | undefined | null | boolean) => {
  return data !== undefined && data !== null && data !== false;
};
// First item should be the entity with the largest scope
// Example: if EditSiteNoteScreen is missing the site and the site note,
// the missing site takes precedence so should come first
const useRequiredData = (requirements: Requirement[]) => {
  useEffect(() => {
    for (let {data, doIfMissing} of requirements) {
      if (!dataExists(data)) {
        if (doIfMissing !== undefined) {
          doIfMissing();
        }
        return;
      }
    }
  }, [requirements]);

  return requirements.every(({data}) => dataExists(data));
};

type Props = {
  requirements: Requirement[];
  // Use "Function as Child" pattern to defer evaluation of children's props, so they may expect required data
  children: () => React.ReactNode;
};

/*
 * This is intended to wrap Screen components so they only render if required data is truthy, and do
 * an action if not. This prevents screens from breaking if, for example, a pull happens that
 * deletes data that is required to view the screen.
 */
export const ScreenDataRequirements = ({requirements, children}: Props) => {
  const requiredDataExists = useRequiredData(requirements);
  if (!requiredDataExists) {
    return null;
  }
  return <>{children()}</>;
};

/*
 * I believe this is not strictly necessary; if a screen is re-rendering, the ScreenDataRequirements component
 * will re-render regardless of if its props change (unless memoized)
 */
export const useMemoizedRequirements = (
  requirementsAsNewObj: Requirement[],
) => {
  const deps = requirementsAsNewObj.flatMap(r => [r.data, r.doIfMissing]);
  return useMemo(() => {
    return requirementsAsNewObj;
    // The linter doesn't like the dynamic dependency list, but the useMemo should only depend on the values of the required data
    // and missing data handlers. If it depends on the list object, it's re-created every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
