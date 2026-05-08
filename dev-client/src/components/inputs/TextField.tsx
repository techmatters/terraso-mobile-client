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
} from 'terraso-mobile-client/components/inputs/TextField.helpers';
import {theme} from 'terraso-mobile-client/theme';

/* TextField — pure, controlled text input.
 *
 * Knows nothing about Formik. Caller passes value/onChangeText/error directly.
 * For Formik-driven forms, use FormTextField (which wraps TextField). */

export type SharedTextFieldProps = {
  label?: string;
  placeholder?: string;
  testID?: string;
  accessibilityLabel?: string;

  type?: TextFieldType;
  multiline?: boolean;
  numberOfLines?: number;
  readOnly?: boolean;
  required?: boolean;
  helperText?: string;

  style?: RNPTextInputProps['style'];
};

/* Discriminated union: showCounter requires maxLength. The compiler will
 * reject `<TextField showCounter />` without a maxLength. */
export type CounterProps =
  | {showCounter?: false; maxLength?: number}
  | {showCounter: true; maxLength: number};

/* State props specific to controlled-mode TextField. FormTextField composes
 * SharedTextFieldProps & CounterProps separately and supplies its own
 * Formik-driven equivalents. New display props belong in SharedTextFieldProps
 * so both components inherit them; new controlled-state props go here. */
export type ControlledStateProps = {
  value?: string;
  onChangeText?: (value: string) => void;
  onBlur?: () => void;
  // Expect parent to handle logic for what error to show, and pass the relevant error  as a prop
  error?: string;
};

export type TextFieldProps = SharedTextFieldProps &
  CounterProps &
  ControlledStateProps;

export const TextField = forwardRef<RNTextInput, TextFieldProps>(
  function TextField(props, ref) {
    const {t} = useTranslation();
    const value = props.value ?? '';
    const preset = TYPE_PRESETS[props.type ?? 'text'];

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
      props.onBlur?.();
    };

    /* Standalone TextField has no Formik submitCount concept — that's only
     * meaningful in the FormTextField wrapper. Pass 0 here so submitCount
     * never affects display in controlled mode. */
    const showError = shouldShowError(props.error, hasBeenBlurred, 0);

    /* Asterisk rides along with the floating label so it's positioned
     * consistently whether the field is empty (label sits in the input) or
     * filled (label sits above). */
    const displayLabel =
      props.label && props.required ? `${props.label} *` : props.label;

    /* Visual asterisk doesn't translate to a screen reader; augment the
     * accessibility label so required-ness is announced. */
    const a11yLabel =
      props.accessibilityLabel ??
      (props.label && props.required
        ? `${props.label}, required`
        : props.label);

    const counterText =
      props.showCounter && props.maxLength !== undefined
        ? t('general.character_limit', {
            current: value.length,
            limit: props.maxLength,
          })
        : undefined;

    return (
      <View style={styles.viewContainer}>
        <RNPTextInput
          ref={ref}
          mode="flat"
          label={displayLabel}
          placeholder={props.placeholder}
          value={value}
          onChangeText={props.onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          error={showError}
          multiline={props.multiline}
          numberOfLines={props.numberOfLines}
          maxLength={props.maxLength}
          editable={!props.readOnly}
          testID={props.testID}
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
            props.multiline && styles.multilineInput,
            props.style,
          ]}
        />
        {/* padding="normal" left-aligns all of these with the input text. */}
        {props.readOnly ? (
          <HelperText type="info" visible padding="normal">
            {t('general.read_only')}
          </HelperText>
        ) : (
          <>
            {showError ? (
              <HelperText type="error" visible padding="normal">
                {props.error}
              </HelperText>
            ) : props.helperText ? (
              <HelperText type="info" visible padding="normal">
                {props.helperText}
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
