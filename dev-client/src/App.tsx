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

import {useEffect} from 'react';
import {PermissionsAndroid, LogBox} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {Provider} from 'react-redux';
import {NavigationContainer} from '@react-navigation/native';
import {NativeBaseProvider} from 'native-base';
import Mapbox from '@rnmapbox/maps';

import 'terraso-mobile-client/translations';
import 'terraso-mobile-client/config';
import {theme} from 'terraso-mobile-client/theme';
import {RootNavigator} from 'terraso-mobile-client/navigation/navigators/RootNavigator';
import {createStore} from 'terraso-mobile-client/store';
import {checkAndroidPermissions} from 'terraso-mobile-client/native/checkAndroidPermissions';
import {APP_CONFIG} from 'terraso-mobile-client/config';
import {GeospatialProvider} from 'terraso-mobile-client/context/GeospatialContext';
import {Toasts} from 'terraso-mobile-client/screens/Toasts';

import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: APP_CONFIG.sentryDsn,
  environment: APP_CONFIG.environment,
});

Mapbox.setAccessToken(APP_CONFIG.mapboxAccessToken);

LogBox.ignoreLogs([
  'In React 18, SSRProvider is not necessary and is a noop. You can remove it from your app.',
]);

const store = createStore();

function App(): JSX.Element {
  useEffect(() =>
    checkAndroidPermissions(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ),
  );

  return (
    <GestureHandlerRootView style={style}>
      <Provider store={store}>
        <NativeBaseProvider theme={theme}>
          <NavigationContainer>
            <GeospatialProvider>
              <Toasts />
              <RootNavigator />
            </GeospatialProvider>
          </NavigationContainer>
        </NativeBaseProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

const style = {flex: 1};

export default Sentry.wrap(App);
