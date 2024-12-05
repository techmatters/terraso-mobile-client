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
import 'react-native-get-random-values';

import {LogBox} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {Provider} from 'react-redux';

import {NavigationContainer} from '@react-navigation/native';
import Mapbox from '@rnmapbox/maps';
import {NativeBaseProvider} from 'native-base';

import 'terraso-mobile-client/translations';
import 'terraso-mobile-client/config';

import {useState} from 'react';
import {PaperProvider, Portal} from 'react-native-paper';
import {enableFreeze} from 'react-native-screens';

import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {captureConsoleIntegration} from '@sentry/core';
import * as Sentry from '@sentry/react-native';

import {RestrictByFlag} from 'terraso-mobile-client/components/RestrictByFlag';
import {APP_CONFIG} from 'terraso-mobile-client/config';
import {ForegroundPermissionsProvider} from 'terraso-mobile-client/context/AppPermissionsContext';
import {ConnectivityContextProvider} from 'terraso-mobile-client/context/connectivity/ConnectivityContext';
import {GeospatialProvider} from 'terraso-mobile-client/context/GeospatialContext';
import {HeaderHeightContext} from 'terraso-mobile-client/context/HeaderHeightContext';
import {SitesScreenContextProvider} from 'terraso-mobile-client/context/SitesScreenContext';
import {SyncNotificationContextProvider} from 'terraso-mobile-client/context/SyncNotificationContext';
import {RootNavigator} from 'terraso-mobile-client/navigation/navigators/RootNavigator';
import {Toasts} from 'terraso-mobile-client/screens/Toasts';
import {createStore} from 'terraso-mobile-client/store';
import {
  loadPersistedReduxState,
  patchPersistedReduxState,
} from 'terraso-mobile-client/store/persistence';
import {PullDispatcher} from 'terraso-mobile-client/store/sync/PullDispatcher';
import {PullRequester} from 'terraso-mobile-client/store/sync/PullRequester';
import {PushDispatcher} from 'terraso-mobile-client/store/sync/PushDispatcher';
import {paperTheme, theme} from 'terraso-mobile-client/theme';

enableFreeze(true);

// On production environment:
// - mask user data
// - use a 10% sample rate
// - disable Sentry debugging
const isProduction = APP_CONFIG.environment === 'production';

if (APP_CONFIG.sentryEnabled) {
  Sentry.init({
    debug: !isProduction,
    dsn: APP_CONFIG.sentryDsn,
    environment: APP_CONFIG.environment,
    integrations: [
      captureConsoleIntegration({levels: ['warn', 'error']}),
      Sentry.mobileReplayIntegration({
        maskAllImages: isProduction,
        maskAllVectors: isProduction,
        maskAllText: isProduction,
      }),
    ],
    enableCaptureFailedRequests: true,
    tracePropagationTargets: [APP_CONFIG.terrasoApiHostname],
    enableUserInteractionTracing: true,
    tracesSampleRate: isProduction ? 0.1 : 1.0,
    _experiments: {
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    },
  });
}

Mapbox.setAccessToken(APP_CONFIG.mapboxAccessToken);

LogBox.ignoreLogs([
  'In React 18, SSRProvider is not necessary and is a noop. You can remove it from your app.',
]);

let persistedReduxState = loadPersistedReduxState();
if (persistedReduxState) {
  persistedReduxState = patchPersistedReduxState(persistedReduxState);
}
const store = createStore(persistedReduxState);

function App(): React.JSX.Element {
  const [headerHeight, setHeaderHeight] = useState(0);

  /*
   * Notes on app root stack ordering:
   * - Provider should be above all other content, since it exposes our Redux store
   * - HeaderHeightContext needs to be above bottom sheets, so they can access its height values for sizing
   * - NavigationContainer needs to be above any app content (including modals) since content may include
   *    functionality that navigates to new screens
   * - There currently need to be two BottomSheetModalProvider instances, one below
   *    PaperProvider/NativeBaseProvider and one above, since some modals can open sheets, and some sheets need
   *    NB/Paper components.
   */

  return (
    <GestureHandlerRootView style={style}>
      <Provider store={store}>
        <NavigationContainer>
          <ConnectivityContextProvider>
            <HeaderHeightContext.Provider
              value={{headerHeight, setHeaderHeight}}>
              <BottomSheetModalProvider>
                <PaperProvider theme={paperTheme}>
                  <NativeBaseProvider theme={theme}>
                    <Portal.Host>
                      <BottomSheetModalProvider>
                        <GeospatialProvider>
                          <Toasts />
                          <SitesScreenContextProvider>
                            <ForegroundPermissionsProvider>
                              <SyncNotificationContextProvider>
                                <RestrictByFlag flag="FF_offline">
                                  <PushDispatcher />
                                  <PullRequester />
                                  <PullDispatcher />
                                </RestrictByFlag>
                                <RootNavigator />
                              </SyncNotificationContextProvider>
                            </ForegroundPermissionsProvider>
                          </SitesScreenContextProvider>
                        </GeospatialProvider>
                      </BottomSheetModalProvider>
                    </Portal.Host>
                  </NativeBaseProvider>
                </PaperProvider>
              </BottomSheetModalProvider>
            </HeaderHeightContext.Provider>
          </ConnectivityContextProvider>
        </NavigationContainer>
      </Provider>
    </GestureHandlerRootView>
  );
}

const style = {flex: 1};

export default APP_CONFIG.sentryEnabled ? Sentry.wrap(App) : App;
