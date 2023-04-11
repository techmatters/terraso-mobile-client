/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import {StyleSheet, View} from 'react-native';

import Mapbox from '@rnmapbox/maps';

Mapbox.setAccessToken(
  'pk.eyJ1Ijoic2hyb3V4bSIsImEiOiJjbGY4bW8wbGEwbDJnM3FsN3I1ZzBqd2kzIn0.2Alc4o911ooGEtnObLpOUQ',
);

function App(): JSX.Element {
  return (
    <View style={styles.container}>
      <Mapbox.MapView style={styles.map} />
    </View>
  );
}

const styles = StyleSheet.create({map: {flex: 1}, container: {flex: 1}});

export default App;
