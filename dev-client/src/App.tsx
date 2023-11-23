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

import {useEffect, useMemo} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import Mapbox from '@rnmapbox/maps';
import {NativeBaseProvider} from 'native-base';
import {theme} from 'terraso-mobile-client/theme';
import {LoginProvider} from 'terraso-mobile-client/context/LoginContext';
import {AppScaffold} from 'terraso-mobile-client/screens/AppScaffold';
import 'terraso-mobile-client/translations';
import {checkAndroidPermissions} from 'terraso-mobile-client/native';
import {PermissionsAndroid} from 'react-native';
import {Provider} from 'react-redux';
import 'terraso-mobile-client/config';
import {createStore} from 'terraso-mobile-client/model/store';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {APP_CONFIG} from 'terraso-mobile-client/config';
import {LogBox} from 'react-native';
import {GeospatialProvider} from 'terraso-mobile-client/context/GeospatialContext';

Mapbox.setAccessToken(APP_CONFIG.mapboxAccessToken);
LogBox.ignoreLogs([
  'In React 18, SSRProvider is not necessary and is a noop. You can remove it from your app.',
]);

function App(): JSX.Element {
  const store = useMemo(createStore, []);
  useEffect(() =>
    checkAndroidPermissions(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ),
  );
  return (
    // eslint-disable-next-line react-native/no-inline-styles
    <GestureHandlerRootView style={{flex: 1}}>
      <Provider store={store}>
        <NativeBaseProvider theme={theme}>
          <NavigationContainer>
            <GeospatialProvider>
              <AppScaffold />
            </GeospatialProvider>
          </NavigationContainer>
        </NativeBaseProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

export default App;
