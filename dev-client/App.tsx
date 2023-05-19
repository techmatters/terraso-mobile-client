/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useEffect} from 'react';
import {PermissionsAndroid, Platform, StyleSheet, View} from 'react-native';

import Mapbox from '@rnmapbox/maps';
import {Button, NativeBaseProvider, Text} from 'native-base';
import {theme} from './theme';
import LoginView from './components/Login';
import SiteMap from './components/SiteMap';
import {DisplaySite} from './datatypes/sites';

Mapbox.setAccessToken(
  'pk.eyJ1Ijoic2hyb3V4bSIsImEiOiJjbGY4bW8wbGEwbDJnM3FsN3I1ZzBqd2kzIn0.2Alc4o911ooGEtnObLpOUQ',
);

function App(): JSX.Element {
  useEffect(() => {
    if (Platform.OS !== 'android') {
      // only need to request location permissions explicitly on Android
      return;
    }
    const locationGranted = PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    )
      .then(granted => {
        if (granted == PermissionsAndroid.RESULTS.GRANTED) {
          console.log('You can use the camera');
        } else {
          // TODO: What to do if rejected?
          console.error('You cannot use the camera');
        }
      })
      .catch(err => {
        // TODO: What to do on error?
        console.error(err);
      });
  });

  return (
    <NativeBaseProvider theme={theme}>
      <View
        style={[
          styles.container,
          {
            justifyContent: 'center',
          },
        ]}>
        <SiteMap
          sites={[
            {lat: 0.0, lon: 0.3, name: 'TEST SITE 1'},
            {lat: 0.1, lon: 0.5, name: 'TEST SITE 2'},
          ]}
          center={[0, 0]}
        />
        {/* <LoginView /> */}
      </View>
    </NativeBaseProvider>
  );
}

const styles = StyleSheet.create({map: {flex: 1}, container: {flex: 1}});

export default App;
