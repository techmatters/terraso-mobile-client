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

import {ViewStyle} from 'react-native';
import {TextInput} from 'react-native-paper';
import {theme} from 'terraso-mobile-client/theme';
import {StyleSheet} from 'react-native';

export type TextProps = {
  value?: string;
  label?: string;
  onChangeText?: (a: string) => void;
  disabled?: boolean;
} & ViewStyle;

const styles = StyleSheet.create({
  text: {
    width: '100%',
    backgroundColor: theme.colors.input.filled.enabledFill,
  },
});

export const Text = ({
  value,
  label,
  onChangeText,
  disabled = false,
  ...style
}: TextProps) => {
  return (
    <TextInput
      label={label}
      value={value}
      onChangeText={onChangeText}
      disabled={disabled}
      style={{...styles.text, ...style}}
    />
  );
};
