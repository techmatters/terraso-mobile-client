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

import React, {useCallback, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {ScrollView} from 'react-native-gesture-handler';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {DialogButton} from 'terraso-mobile-client/components/buttons/DialogButton';
import {Fab} from 'terraso-mobile-client/components/buttons/Fab';
import {IconButton} from 'terraso-mobile-client/components/buttons/icons/IconButton';
import {OutlinedButton} from 'terraso-mobile-client/components/buttons/OutlinedButton';
import {SlopeMeterButton} from 'terraso-mobile-client/components/buttons/special/SlopeMeterButton';
import {TextButton} from 'terraso-mobile-client/components/buttons/TextButton';
import {Heading} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {convertColorProp} from 'terraso-mobile-client/components/util/nativeBaseAdapters';

export const UiComponentList = () => {
  const [show, setShow] = useState(false);
  const toggle = useCallback(() => setShow(!show), [show, setShow]);

  return (
    <View>
      <ContainedButton
        label="UI Components: Show/Hide"
        stretchToFit={true}
        onPress={toggle}
      />
      {show && (
        <>
          <ComponentList title="Buttons">
            <Heading variant="h5">TextButton</Heading>
            <TextButton
              label="type: default"
              leftIcon="info"
              rightIcon="info"
            />
            <TextButton
              label="type: destructive"
              type="destructive"
              leftIcon="info"
              rightIcon="info"
            />
            <TextButton
              label="disabled"
              disabled
              leftIcon="info"
              rightIcon="info"
            />
            <Heading variant="h5">ContainedButton</Heading>
            <ContainedButton
              label="size:SM"
              size="sm"
              leftIcon="info"
              rightIcon="info"
            />
            <ContainedButton
              label="size:MD"
              size="md"
              leftIcon="info"
              rightIcon="info"
            />
            <ContainedButton
              label="size:LG"
              size="lg"
              leftIcon="info"
              rightIcon="info"
            />
            <ContainedButton
              label="stretch"
              stretchToFit
              leftIcon="info"
              rightIcon="info"
            />
            <ContainedButton
              label="disabled"
              disabled
              leftIcon="info"
              rightIcon="info"
            />
            <Heading variant="h5">DialogButton</Heading>
            <DialogButton label="type: default" />
            <DialogButton label="type: destructive" type="destructive" />
            <DialogButton label="type: outlined" type="outlined" />
            <Heading variant="h5">OutlinedButton</Heading>
            <OutlinedButton label="default" />
            <OutlinedButton label="disabled" disabled />
            <Heading variant="h5">SlopeMeterButton</Heading>
            <SlopeMeterButton />
            <Heading variant="h6">FAB</Heading>
            <Fab label="default" leftIcon="info" />
          </ComponentList>
          <ComponentList title="IconButtons">
            <Heading variant="h5">IconButton</Heading>
            <View style={styles.darkBackground}>
              <IconButton type="sm" variant="light" name="info" />
              <IconButton type="md" variant="light" name="info" />
              <IconButton type="sm" variant="light-filled" name="info" />
              <IconButton type="md" variant="light-filled" name="info" />
            </View>
            <IconButton type="sm" variant="location" name="location-pin" />
            <IconButton type="md" variant="location" name="location-pin" />
            <IconButton type="sm" variant="normal" name="info" />
            <IconButton type="md" variant="normal" name="info" />
            <IconButton type="sm" variant="normal-filled" name="info" />
            <IconButton type="md" variant="normal-filled" name="info" />
          </ComponentList>
        </>
      )}
    </View>
  );
};

const ComponentList = ({
  title,
  children,
}: React.PropsWithChildren<{title: string}>) => {
  const [show, setShow] = useState(false);
  const toggle = useCallback(() => setShow(!show), [show, setShow]);

  return (
    <View>
      <ContainedButton label={`${title}: Show/Hide`} onPress={toggle} />
      {show && <ScrollView style={styles.container}>{children}</ScrollView>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {maxHeight: 300},
  darkBackground: {backgroundColor: convertColorProp('primary.dark')},
});
