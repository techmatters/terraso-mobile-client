/*
 * Copyright © 2026 Technology Matters
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

import {forwardRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {TextInput as RNTextInput, StyleSheet, View} from 'react-native';
import {
  HelperText,
  TextInput as RNPTextInput,
  TextInputProps as RNPTextInputProps,
} from 'react-native-paper';

import {
  shouldShowError,
  TextFieldType,
  TYPE_PRESETS,
} from 'terraso-mobile-client/components/inputs/TextFieldHelpers';
import {theme} from 'terraso-mobile-client/theme';

/* TextField — pure, controlled text input.
 *
 * Knows nothing about Formik. Caller passes value/onChangeText/error directly.
 * For Formik-driven forms, use FormTextField (which wraps TextField). */

/* Discriminated union: `showCounter` requires `maxLength`. The compiler will
 * reject `<TextField showCounter />` without a maxLength. Local helper —
 * folded into SharedTextFieldProps below so callers only need that one type. */
type CounterProps =
  | {showCounter?: false; maxLength?: number}
  | {showCounter: true; maxLength: number};

export type SharedTextFieldProps = {
  label?: string;
  placeholder?: string;
  testID?: string;
  accessibilityLabel?: string;

  type?: TextFieldType;
  multiline?: boolean;
  readOnly?: boolean;
  required?: boolean;
  helperText?: string;

  style?: RNPTextInputProps['style'];
} & CounterProps;

/* State props specific to controlled-mode TextField. FormTextField composes
 * SharedTextFieldProps and supplies its own Formik-driven equivalents.
 * New display props belong in SharedTextFieldProps so both components inherit
 * them; new controlled-state props go here. */
export type ControlledStateProps = {
  value: string;
  onChangeText?: (value: string) => void;
  onBlur?: () => void;
  // Expect parent to handle logic for what error to show, and pass the relevant error as a prop
  error?: string;
};

export type TextFieldProps = SharedTextFieldProps & ControlledStateProps;

export const TextField = forwardRef<RNTextInput, TextFieldProps>(
  (
    {
      label,
      placeholder,
      testID,
      accessibilityLabel,
      type,
      multiline,
      readOnly,
      required,
      helperText,
      style,
      showCounter,
      maxLength,
      value = '',
      onChangeText,
      onBlur,
      error,
    },
    ref,
  ) => {
    const {t} = useTranslation();
    const preset = TYPE_PRESETS[type ?? 'text'];

    /* Focus state tracked locally because Paper's TextInput doesn't expose a
     * focus signal to consumers. */
    const [isFocused, setIsFocused] = useState(false);

    /* hasBeenBlurred is the controlled-mode equivalent of Formik's `touched`.
     * Doesn't reset on subsequent focus — once touched, always touched. */
    const [hasBeenBlurred, setHasBeenBlurred] = useState(false);

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => {
      setIsFocused(false);
      setHasBeenBlurred(true);
      onBlur?.();
    };

    /* Standalone TextField has no Formik submitCount concept — that's only
     * meaningful in the FormTextField wrapper. Pass 0 here so submitCount
     * never affects display in controlled mode. */
    const showError = shouldShowError(error, hasBeenBlurred, 0);

    /* Asterisk rides along with the floating label so it's positioned
     * consistently whether the field is empty (label sits in the input) or
     * filled (label sits above). */
    const displayLabel = label && required ? `${label} *` : label;

    /* Visual asterisk doesn't translate to a screen reader; augment the
     * accessibility label so required-ness is announced. */
    const a11yLabel =
      accessibilityLabel ?? (label && required ? `${label}, required` : label);

    const counterText =
      showCounter && maxLength !== undefined
        ? t('general.character_limit', {
            current: value.length,
            limit: maxLength,
          })
        : undefined;

    return (
      <View style={styles.viewContainer}>
        <RNPTextInput
          ref={ref}
          mode="flat"
          label={displayLabel}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          error={showError}
          multiline={multiline}
          maxLength={maxLength}
          editable={!readOnly}
          testID={testID}
          accessibilityLabel={a11yLabel}
          keyboardType={preset.keyboardType}
          autoCapitalize={preset.autoCapitalize}
          autoComplete={preset.autoComplete}
          activeUnderlineColor={theme.colors.input.standard.hoverBorder}
          underlineColor={theme.colors.input.standard.enabledBorder}
          selectionColor={theme.colors.text.primary}
          style={[
            styles.input,
            isFocused && styles.focusedInput,
            multiline && styles.multilineInput,
            style,
          ]}
        />
        {readOnly ? (
          <HelperText type="info" visible padding="normal">
            {t('general.read_only')}
          </HelperText>
        ) : (
          <>
            {showError ? (
              <HelperText type="error" visible padding="normal">
                {error}
              </HelperText>
            ) : helperText ? (
              <HelperText type="info" visible padding="normal">
                {helperText}
              </HelperText>
            ) : null}
            {counterText !== undefined && (
              <HelperText type="info" visible padding="normal">
                {counterText}
              </HelperText>
            )}
          </>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  input: {
    width: '100%',
    backgroundColor: theme.colors.input.filled.enabledFill,
  },
  focusedInput: {
    backgroundColor: theme.colors.input.filled.hoverFill,
  },
  multilineInput: {
    minHeight: 100,
  },
  viewContainer: {
    paddingTop: 8,
    paddingBottom: 16,
  },
});
