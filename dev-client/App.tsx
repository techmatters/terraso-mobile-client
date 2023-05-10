/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

import Mapbox from '@rnmapbox/maps';
import { Button, NativeBaseProvider, Text } from 'native-base';
import { theme } from './theme';
import LoginView from './components/Login';



Mapbox.setAccessToken(
  'pk.eyJ1Ijoic2hyb3V4bSIsImEiOiJjbGY4bW8wbGEwbDJnM3FsN3I1ZzBqd2kzIn0.2Alc4o911ooGEtnObLpOUQ',
);


function App(): JSX.Element {
  return (
    <NativeBaseProvider theme={theme}>
      <View style={[styles.container, {
        justifyContent: "center"
      }]}>
        { /* <Mapbox.MapView style={styles.map} /> */}
        <LoginView />
      </View>
    </NativeBaseProvider>
  );
}

const styles = StyleSheet.create({ map: { flex: 1 }, container: { flex: 1 } });

export default App;
