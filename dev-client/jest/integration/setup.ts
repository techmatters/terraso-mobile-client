/*
 * Copyright © 2023 Technology Matters
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
import '@testing-library/jest-native';
import 'terraso-mobile-client/translations';
// include this line for mocking react-native-gesture-handler
import 'react-native-gesture-handler/jestSetup';

import {setAPIConfig} from 'terraso-client-shared/config';

// the next 3 jest calls are to get animated components to work in tests
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');

  // The mock for `call` immediately calls the callback which is incorrect
  // So we override it with a no-op
  Reanimated.default.call = () => {};

  return Reanimated;
});
jest.useFakeTimers();
jest.mock('react-native/src/private/animated/NativeAnimatedHelper');

// nanoid is a randomness source used by react navigation, here we are
// setting it to a stable value to get stable snapshot tests
jest.mock('nanoid/non-secure', () => ({nanoid: () => 'stable-nanoid-id'}));

jest.mock('@gorhom/bottom-sheet', () => require('@gorhom/bottom-sheet/mock'));

jest.mock('@expo/vector-icons/MaterialIcons', () => 'Icon');

jest.mock('terraso-mobile-client/config', () => ({
  APP_CONFIG: {},
}));

setAPIConfig({
  terrasoAPIURL: 'http://127.0.0.1:8000',
  graphQLEndpoint: '/graphql/',
  tokenStorage: {
    getToken: async () => undefined,
  } as any,
  logger: jest.fn(),
});

// TODO: We get annoying warnings of the style
// WARN  `new NativeEventEmitter()` was called with a non-null argument without the required `addListener` method.
// Should look into why (probably some of our mocks?) and see if we can fix it
global.console.warn = jest.fn();
// TODO: Disable errors as well. We get:
// Warning: An update to ForwardRef inside a test was not wrapped in act(...).
// for native base animations. Would be nice to figure out how to disable this
// For now, just silence
global.console.error = jest.fn();
