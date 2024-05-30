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
import {
  TextInputProps as RNPTextInputProps,
  TextInput as RNPTextInput,
} from 'react-native-paper';
import {theme} from 'terraso-mobile-client/theme';
import {StyleSheet} from 'react-native';

export type TextInputProps = {
  ref?: string;
  mode?: RNPTextInputProps['mode'];
  multiline?: boolean;
  value?: string;
  label?: string;
  placeholder?: string;
  onChangeText?: (a: string) => void;
  onBlur?: (args: any) => void;
  onSubmitEditing?: (args: any) => void;
  style?: any;
  disabled?: boolean;
  textInputProps?: Omit<RNPTextInputProps, 'label'>;
} & ViewStyle;

const styles = StyleSheet.create({
  text: {
    width: '100%',
    padding: 0,
    backgroundColor: theme.colors.input.filled.enabledFill,
  },
});

export const TextInput = ({
  mode,
  multiline,
  ref,
  value,
  label,
  placeholder,
  onChangeText,
  onBlur,
  onSubmitEditing,
  disabled = false,
  style,
  textInputProps,
}: TextInputProps) => {
  if (multiline) {
    style = {
      minHeight: 100,
    };
  }

  return (
    <RNPTextInput
      ref={ref}
      mode={mode}
      label={label}
      value={value}
      placeholder={placeholder}
      multiline={multiline}
      onChangeText={onChangeText}
      onBlur={onBlur}
      onSubmitEditing={onSubmitEditing}
      disabled={disabled}
      activeUnderlineColor={theme.colors.input.standard.enabledBorder}
      style={{...styles.text, ...style}}
      {...textInputProps}
    />
  );
};
