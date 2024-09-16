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

import {APP_CONFIG, MMKV} from 'terraso-mobile-client/config';

// When you add a new flag:
// 1) Add it to featureFlags here
// 2) Set it in APP_CONFIG
// 3) Add a FeatureFlagControl for it
export const featureFlags = {
  FF_offline: {
    defaultIsEnabled: false,
    description: 'Enables support for offline mode',
  },
};

export type FeatureFlagName = keyof typeof featureFlags;

export const isFlagEnabled = (flag: FeatureFlagName) => {
  return APP_CONFIG[flag] as boolean;
};

export const willFlagBeEnabledOnReload = (flag: FeatureFlagName) => {
  return MMKV.getBool(flag) ?? featureFlags[flag].defaultIsEnabled;
};

export const setFlagEnabledOnReload = (
  flag: FeatureFlagName,
  isEnabled: boolean,
) => {
  MMKV.setBool('FF_offline', isEnabled);
};
