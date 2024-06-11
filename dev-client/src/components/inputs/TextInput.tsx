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

import {forwardRef} from 'react';
import {TextInput as RNTextInput, StyleSheet} from 'react-native';
import {
  TextInput as RNPTextInput,
  TextInputProps as RNPTextInputProps,
} from 'react-native-paper';

import {theme} from 'terraso-mobile-client/theme';

export type TextInputProps = RNPTextInputProps;

export const TextInput = forwardRef<RNTextInput, TextInputProps>(
  ({mode, multiline, disabled = false, style, ...props}, ref) => {
    const styles = StyleSheet.create({
      text: {
        width: mode === 'outlined' ? '85%' : '100%',
        minHeight: multiline ? 100 : undefined,
        backgroundColor:
          mode === 'outlined'
            ? theme.colors.background.default
            : theme.colors.input.filled.enabledFill,
      },
    });

    return (
      <RNPTextInput
        ref={ref}
        mode={mode}
        multiline={multiline}
        disabled={disabled}
        activeUnderlineColor={theme.colors.input.standard.enabledBorder}
        style={[styles.text, style]}
        {...props}
      />
    );
  },
);
