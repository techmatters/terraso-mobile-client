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

// Suppress known third-party library warnings that are not actionable.
// Must be called BEFORE any imports that generate warnings.
// - 'SSRProvider': Native Base includes deprecated SSRProvider from React Aria (no-op in React 18+)
// - 'is not a valid color or brush': Native Base + React 19 compatibility issue where Radio
//   components internally pass empty strings to react-native-svg. Defensive code prevents
//   the error, but warning still appears. See WARNINGS_TO_FIX.md Issue #7.
// - 'Invalid size is used for setting the map view': Mapbox timing issue during app startup.
//   Maps display correctly despite warnings. See WARNINGS_TO_FIX.md Issue #8.
const IGNORED_WARNINGS = [
  'SSRProvider',
  'is not a valid color or brush',
  'Invalid size is used for setting the map view',
];

// Suppress warnings in app UI (LogBox yellow boxes in development builds)
LogBox.ignoreLogs(IGNORED_WARNINGS);

// Suppress warnings in console output (LogBox.ignoreLogs has a bug and doesn't filter console)
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const message = String(args[0] || '');
  if (IGNORED_WARNINGS.some(pattern => message.includes(pattern))) {
    return; // Suppress
  }
  originalWarn(...args);
};

enableFreeze(true);

Mapbox.setAccessToken(APP_CONFIG.mapboxAccessToken);

let persistedReduxState = loadPersistedReduxState();
if (persistedReduxState) {
  persistedReduxState = patchPersistedReduxState(persistedReduxState);
}
const store = createStore(persistedReduxState);

/* Developer FYI: To enable the Little Snitch tool to simulate offline mode without losing connection to Metro:
 * - Uncomment the code below
 * - import NetInfo from '@react-native-community/netinfo'
 * - See "Offline Debugging" section in Terraso Development Guide for more info
 */
// NetInfo.configure({
//   reachabilityUrl: 'https://connectivitycheck.gstatic.com/generate_204',
//   reachabilityTest: async response => response.status === 204,
//   reachabilityLongTimeout: 2000,
//   useNativeReachability: false,
// });

const App = () => {
  return (
    <AppWrappers store={store}>
      <AppContent />
    </AppWrappers>
  );
};

export default wrapSentry(App);
