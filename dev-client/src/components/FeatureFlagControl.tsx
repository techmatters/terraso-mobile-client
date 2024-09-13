/*
 * Copyright © 2024 Technology Matters
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
import {useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Divider, Switch} from 'react-native-paper';

import {
  Heading,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {APP_CONFIG, MMKV} from 'terraso-mobile-client/config';

export const FeatureFlagControlOrEmptyInProd = () => {
  // It may cause issues to toggle a feature flag state while the app is running,
  // so expect the user to restart the app if they want to change the feature flag state.
  // This should never be exposed in production.

  const currentFlagState = APP_CONFIG.FF_offline;
  const [nextFlagState, setNextFlagState] = useState<boolean>(
    MMKV.getBool('FF_offline') ?? APP_CONFIG.FF_offline,
  );

  // nextFlagState and MMKV state should be kept in sync
  const onToggle = () => {
    MMKV.setBool('FF_offline', !nextFlagState);
    setNextFlagState(!nextFlagState);
  };

  return (
    <>
      {APP_CONFIG.environment !== 'production' && (
        <>
          <Divider />
          <View>
            <Heading mb="10px">Feature Flags</Heading>
            <Text bold={true}>FF_offline</Text>
            <Text>{`Currently: ${currentFlagState ? 'ON' : 'OFF'}`}</Text>
            <View style={styles.nextFlagStateView}>
              <Text>{`On next startup will be: `}</Text>
              <Switch value={nextFlagState} onValueChange={onToggle} />
              <Text>{` ${nextFlagState ? 'ON' : 'OFF'}`}</Text>
            </View>
          </View>
        </>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  nextFlagStateView: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
