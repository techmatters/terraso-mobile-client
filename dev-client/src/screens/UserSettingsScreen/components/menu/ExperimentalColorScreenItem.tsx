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

import {MenuItem} from 'terraso-mobile-client/components/menus/MenuItem';
import {APP_CONFIG} from 'terraso-mobile-client/config';
import {
  setExperimentalColorScreenEnabled,
  useIsExperimentalColorScreenEnabled,
} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/experimentalColorScreenToggle';

// Dev-only two-state selector: which ColorScreen the soil-color route
// dispatches to (see ColorScreenRouter). Tapping the row flips between
// "Production" and "Experimental" and re-renders any subscribers.
export const ExperimentalColorScreenItem = () => {
  const isExperimental = useIsExperimentalColorScreenEnabled();

  const toggle = useCallback(() => {
    setExperimentalColorScreenEnabled(!isExperimental);
  }, [isExperimental]);

  if (APP_CONFIG.environment === 'production') {
    return null;
  }

  return (
    <MenuItem
      variant="default"
      icon="science"
      label={`Color analysis: ${isExperimental ? 'Experimental' : 'Production'}`}
      onPress={toggle}
    />
  );
};
