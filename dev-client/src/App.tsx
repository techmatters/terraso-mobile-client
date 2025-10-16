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

/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

// react-native-get-random-values needed for uuid - https://github.com/uuidjs/uuid#react-native--expo
import 'setimmediate';
import 'react-native-get-random-values';

import {LogBox} from 'react-native';

import Mapbox from '@rnmapbox/maps';

import 'terraso-mobile-client/translations';
import 'terraso-mobile-client/config';

import {enableFreeze} from 'react-native-screens';

import {AppContent} from 'terraso-mobile-client/app/AppContent';
import {AppWrappers} from 'terraso-mobile-client/app/AppWrappers';
import {wrapSentry} from 'terraso-mobile-client/app/Sentry';
import {APP_CONFIG} from 'terraso-mobile-client/config';
import {createStore} from 'terraso-mobile-client/store';
import {
  loadPersistedReduxState,
  patchPersistedReduxState,
} from 'terraso-mobile-client/store/persistence';

enableFreeze(true);

Mapbox.setAccessToken(APP_CONFIG.mapboxAccessToken);

// Suppress known third-party library warnings that are not actionable:
// - 'SSRProvider': Native Base includes deprecated SSRProvider from React Aria (no-op in React 18+)
// - 'is not a valid color or brush': Native Base + React 19 compatibility issue where Radio
//   components internally pass empty strings to react-native-svg. Defensive code prevents
//   the error, but warning still appears. See WARNINGS_TO_FIX.md Issue #7.
LogBox.ignoreLogs([
  'SSRProvider',
  'is not a valid color or brush',
]);

let persistedReduxState = loadPersistedReduxState();
if (persistedReduxState) {
  persistedReduxState = patchPersistedReduxState(persistedReduxState);
}
const store = createStore(persistedReduxState);

const App = () => {
  return (
    <AppWrappers store={store}>
      <AppContent />
    </AppWrappers>
  );
};

export default wrapSentry(App);
