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
  setExperimentalRawColorEnabled,
  useIsExperimentalRawColorEnabled,
} from 'terraso-mobile-client/model/rawColor/experimentalRawColorToggle';

// Dev-only switch for the experimental RAW-colour path. Flipping it on reveals
// the RAW capture test entry (RawCaptureTestItem) and, eventually, the
// experimental colour screen. Lives under the FF_testing dev menu; hidden in
// production builds entirely.
export const ExperimentalRawColorToggleItem = () => {
  const enabled = useIsExperimentalRawColorEnabled();
  const onPress = useCallback(
    () => setExperimentalRawColorEnabled(!enabled),
    [enabled],
  );
  if (APP_CONFIG.environment === 'production') {
    return null;
  }
  return (
    <MenuItem
      variant="default"
      icon="science"
      label={`Experimental RAW color: ${enabled ? 'ON' : 'OFF'}`}
      onPress={onPress}
    />
  );
};
