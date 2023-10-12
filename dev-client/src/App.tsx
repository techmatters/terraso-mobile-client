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
import {theme} from './theme';
import {LoginProvider} from './context/LoginContext';
import AppScaffold from './screens/AppScaffold';
import './translations';
import {checkAndroidPermissions} from './native';
import {PermissionsAndroid} from 'react-native';
import {Provider} from 'react-redux';
import './config';
import {createStore} from './model/store';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {APP_CONFIG} from './config';
import {LogBox} from 'react-native';

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
            <LoginProvider>
              <AppScaffold />
            </LoginProvider>
          </NavigationContainer>
        </NativeBaseProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

export default App;
