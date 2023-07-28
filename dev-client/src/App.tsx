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

Mapbox.setAccessToken(
  'pk.eyJ1Ijoic2hyb3V4bSIsImEiOiJjbGY4bW8wbGEwbDJnM3FsN3I1ZzBqd2kzIn0.2Alc4o911ooGEtnObLpOUQ',
);

function App(): JSX.Element {
  const store = useMemo(
    () =>
      createStore({
        map: {userLocation: undefined},
        site: {
          sites: {
            id1: {
              id: 'id1',
              name: 'site 1',
              latitude: 48.3820485,
              longitude: -123.5467687323,
              archived: false,
              updatedAt: '',
            },
          },
        },
      }),
    [],
  );
  useEffect(() =>
    checkAndroidPermissions(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ),
  );
  return (
    // eslint-disable-next-line react-native/no-inline-styles
    <GestureHandlerRootView style={{flex: 1}}>
      <NativeBaseProvider theme={theme}>
        <NavigationContainer>
          <LoginProvider>
            <Provider store={store}>
              <AppScaffold />
            </Provider>
          </LoginProvider>
        </NavigationContainer>
      </NativeBaseProvider>
    </GestureHandlerRootView>
  );
}

export default App;
