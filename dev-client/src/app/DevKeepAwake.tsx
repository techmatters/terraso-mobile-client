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

import {useKeepAwake} from 'expo-keep-awake';

import {APP_CONFIG} from 'terraso-mobile-client/config';
import {useIsKeepAwakeDevEnabled} from 'terraso-mobile-client/model/keepAwake/keepAwakeDevToggle';

// Activates keep-awake (mounts the hook) only while enabled; unmounting
// releases it. Separated out so useKeepAwake is never called conditionally.
const KeepAwakeActive = () => {
  useKeepAwake();
  return null;
};

/**
 * App-root activator for the dev "keep screen awake" setting. Mounted once near
 * the top of the tree (always present while the app is open). When the setting
 * is on — and this is not a production build — it holds the device awake while
 * the app is foreground. Renders nothing. iOS reverts automatically the moment
 * the app backgrounds, so "only while the app is open" is inherent, not
 * enforced here. See keepAwakeDevToggle.
 */
export const DevKeepAwake = () => {
  const enabled = useIsKeepAwakeDevEnabled();
  if (APP_CONFIG.environment === 'production' || !enabled) {
    return null;
  }
  return <KeepAwakeActive />;
};
