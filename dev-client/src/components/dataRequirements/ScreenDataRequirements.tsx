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

import {useEffect} from 'react';

type Requirement = {
  data: any;
  doIfMissing?: () => void;
};

const dataExists = (data: object | undefined | null) => {
  return data !== null && data !== undefined;
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
 * This is intended to wrap components (mostly screens as of 2024-12) so they only render
 * if required data is truthy. This prevents screens from breaking if, for example, a pull
 * happens that deletes data that is required to view the screen.
 */
export const ScreenDataRequirements = ({requirements, children}: Props) => {
  const requiredDataExists = useRequiredData(requirements);

  if (!requiredDataExists) {
    return null;
  }
  return <>{children()}</>;
};
