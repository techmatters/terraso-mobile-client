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

import {APP_CONFIG} from 'terraso-mobile-client/config';
import {kvStorage} from 'terraso-mobile-client/persistence/kvStorage';

// When you add a new flag:
// 1) Add it to featureFlags here
// 2) Add a FeatureFlagControl for it
export const featureFlags = {
  FF_offline: {
    defaultIsEnabled: true,
    defaultIsEnabledInDevelopment: true,
    description: 'Enables support for offline mode',
  },
  FF_testing: {
    defaultIsEnabled: false,
    defaultIsEnabledInDevelopment: true,
    description: 'Enables testing-support controls',
  },
};

export type FeatureFlagName = keyof typeof featureFlags;

export const isFlagEnabled = (flag: FeatureFlagName) => {
  return ENABLED_FLAGS[flag];
};

const isFlagDefaultEnabled = (flag: FeatureFlagName) => {
  return APP_CONFIG.environment === 'development'
    ? featureFlags[flag].defaultIsEnabledInDevelopment
    : featureFlags[flag].defaultIsEnabled;
};

export const willFlagBeEnabledOnReload = (flag: FeatureFlagName) => {
  return kvStorage.getBool(flag) ?? isFlagDefaultEnabled(flag);
};

export const setFlagWillBeEnabledOnReload = (
  flag: FeatureFlagName,
  isEnabled: boolean,
) => {
  kvStorage.setBool(flag, isEnabled);
};

const ENABLED_FLAGS = Object.fromEntries(
  Object.keys(featureFlags).map(
    key => [key, willFlagBeEnabledOnReload(key as FeatureFlagName)] as const,
  ),
);
