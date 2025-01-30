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
import {useCallback, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {ScrollView} from 'react-native-gesture-handler';
import {Divider, Switch} from 'react-native-paper';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {ScreenContentSection} from 'terraso-mobile-client/components/content/ScreenContentSection';
import {
  Heading,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {APP_CONFIG} from 'terraso-mobile-client/config';
import {
  FeatureFlagName,
  featureFlags,
  isFlagEnabled,
  setFlagWillBeEnabledOnReload,
  willFlagBeEnabledOnReload,
} from 'terraso-mobile-client/config/featureFlags';

export const FeatureFlagControlPanel = () => {
  const [show, setShow] = useState(false);
  const toggle = useCallback(() => setShow(!show), [show, setShow]);
  return (
    <>
      {APP_CONFIG.environment !== 'production' && (
        <View>
          <ContainedButton
            label="Feature Flags: Show/Hide"
            stretchToFit={true}
            onPress={toggle}
          />
          {show && (
            <>
              <ScrollView>
                <ScreenContentSection>
                  <Heading mb="10px">Feature Flags</Heading>
                  <FeatureFlagControl flag="FF_offline" />
                  <View style={styles.spacer} />
                  <FeatureFlagControl flag="FF_testing" />
                  <Divider />
                </ScreenContentSection>
              </ScrollView>
            </>
          )}
        </View>
      )}
    </>
  );
};

type FeatureFlagControlProps = {flag: FeatureFlagName};

const FeatureFlagControl = ({flag}: FeatureFlagControlProps) => {
  // It may cause issues to toggle a feature flag state while the app is running,
  // so expect the user to restart the app if they want to change the feature flag state.
  // This should never be exposed in production.

  const currentFlagState = isFlagEnabled(flag);
  const [nextFlagState, setNextFlagState] = useState<boolean>(
    willFlagBeEnabledOnReload(flag),
  );

  // nextFlagState and onReload state should be kept in sync. This could be refactored better.
  const onToggle = () => {
    setFlagWillBeEnabledOnReload(flag, !nextFlagState);
    setNextFlagState(!nextFlagState);
  };

  return (
    <View>
      <Text bold={true}>{flag}</Text>
      <Text>{featureFlags[flag].description}</Text>
      <Text>{`Currently: ${currentFlagState ? 'ON' : 'OFF'}`}</Text>
      <View style={styles.nextFlagStateView}>
        <Text>{`On next app launch will be: `}</Text>
        <Switch value={nextFlagState} onValueChange={onToggle} />
        <Text>{` ${nextFlagState ? 'ON' : 'OFF'}`}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  nextFlagStateView: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlPanelContainer: {maxHeight: 300},
  spacer: {paddingVertical: 6},
});
