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
  setKeepAwakeDevEnabled,
  useIsKeepAwakeDevEnabled,
} from 'terraso-mobile-client/model/keepAwake/keepAwakeDevToggle';

// Dev-only switch: when ON, the app keeps the device awake while it is in the
// foreground (DevKeepAwake). Useful for long on-device tests and so native
// rebuilds install without unlocking the phone. Backgrounding the app restores
// normal auto-lock automatically. Hidden in production builds.
export const KeepAwakeToggleItem = () => {
  const enabled = useIsKeepAwakeDevEnabled();
  const onPress = useCallback(
    () => setKeepAwakeDevEnabled(!enabled),
    [enabled],
  );
  if (APP_CONFIG.environment === 'production') {
    return null;
  }
  return (
    <MenuItem
      variant="default"
      icon="bedtime"
      label={`Keep screen awake (dev): ${enabled ? 'ON' : 'OFF'}`}
      onPress={onPress}
    />
  );
};
