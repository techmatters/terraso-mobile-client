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

import {StyleSheet} from 'react-native';
import {Surface, TouchableRippleProps} from 'react-native-paper';

import {ContainedButton} from 'terraso-mobile-client/components/Buttons/ContainedButton';
import {IconName} from 'terraso-mobile-client/components/icons/Icon';

export type FabProps = {
  label: string;
  leftIcon?: IconName;
  disabled?: boolean;
  onPress?: TouchableRippleProps['onPress'];
};

export const Fab = ({label, leftIcon, disabled, onPress}: FabProps) => (
  <Surface style={styles.surface} elevation={2}>
    <ContainedButton
      label={label}
      leftIcon={leftIcon}
      disabled={disabled}
      size="lg"
      onPress={onPress}
    />
  </Surface>
);

const styles = StyleSheet.create({
  surface: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
