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

// Reanimated 4.7's mock crashes unless its jest resolver swaps in the JS (non-native) initializers; chain it in front of jest-expo's React Native resolver rather than replacing it.
const reanimatedResolver = require('react-native-reanimated/jest/resolver');
const reactNativeResolver = require('jest-expo/jest-preset').resolver;
const resolveWithReactNative = require(reactNativeResolver);

module.exports = (request, options) =>
  reanimatedResolver(request, {
    ...options,
    defaultResolver: (req, opts) =>
      resolveWithReactNative(req, {
        ...opts,
        defaultResolver: options.defaultResolver,
      }),
  });
