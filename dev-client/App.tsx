/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React, {useEffect} from 'react';
import {PermissionsAndroid, StyleSheet, View} from 'react-native';

import Mapbox from '@rnmapbox/maps';
import {Button, NativeBaseProvider, Text} from 'native-base';
import {theme} from './theme';
import LoginView from './components/Login';
import SiteMap from './components/SiteMap';
import {DisplaySite} from './datatypes/sites';
import HomeView from './components/HomeView';

Mapbox.setAccessToken(
  'pk.eyJ1Ijoic2hyb3V4bSIsImEiOiJjbGY4bW8wbGEwbDJnM3FsN3I1ZzBqd2kzIn0.2Alc4o911ooGEtnObLpOUQ',
);

function App(): JSX.Element {
  useEffect(() => {
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
        <HomeView
          sites={[new DisplaySite(0.1, 0.1, 'TEST SITE 1')]}
          center={[0, 0]}
        />
        {/* <LoginView /> */}
      </View>
    </NativeBaseProvider>
  );
}

const styles = StyleSheet.create({map: {flex: 1}, container: {flex: 1}});

export default App;
