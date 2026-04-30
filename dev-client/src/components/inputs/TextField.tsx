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

import {forwardRef, memo} from 'react';
import {TextInput as RNTextInput, StyleSheet, View} from 'react-native';
import {
  HelperText,
  TextInput as RNPTextInput,
  TextInputProps as RNPTextInputProps,
} from 'react-native-paper';

import {useFormikContext} from 'formik';

import {
  ErrorVisibility,
  formatCounter,
  formatRequiredLabel,
  FormikSnapshot,
  resolveTextFieldState,
  shouldShowError,
  TextFieldType,
  TYPE_PRESETS,
} from 'terraso-mobile-client/components/inputs/TextField.helpers';
import {theme} from 'terraso-mobile-client/theme';

/*
 * TextField — unified text-input component.
 *
 * Operates in one of three MODES, transparently selected by props:
 *
 *   FORMIK MODE      — pass `name`. State (value, error, touched) is read
 *                      from the surrounding Formik provider. A caller-supplied
 *                      `onChangeText` runs *after* Formik so layered side
 *                      effects work.
 *
 *   CONTROLLED MODE  — pass `value` + `onChangeText`. No Formik required.
 *                      Caller passes `error` directly when invalid.
 *
 *   BARE MODE        — pass none of the above. Renders as a styled input
 *                      without any state wiring (rare; mostly useful for
 *                      placeholder layouts).
 *
 * State resolution is delegated to `resolveTextFieldState` in TextField.helpers.ts
 * to keep the mode logic pure and unit-testable. This component is mostly
 * composition: pick the right state, decide whether to show errors, render.
 */

type CommonProps = {
  // Identity / accessibility
  label?: string;
  placeholder?: string;
  testID?: string;
  accessibilityLabel?: string;

  // Formik integration (Formik mode)
  name?: string;

  // Controlled state (controlled mode)
  value?: string;
  onChangeText?: (value: string) => void;
  onBlur?: () => void;

  // Behavior
  type?: TextFieldType;
  multiline?: boolean;
  numberOfLines?: number;
  disabled?: boolean;
  autoFocus?: boolean;
  required?: boolean;
  errorVisibility?: ErrorVisibility;

  // Display
  helperText?: string;
  error?: string;

  // Style override; merged on top of TextField defaults.
  style?: RNPTextInputProps['style'];
};

/* `showCounter` requires `maxLength` — enforced at the type level. */
type CounterProps =
  | {showCounter?: false; maxLength?: number}
  | {showCounter: true; maxLength: number};

export type TextFieldProps = CommonProps & CounterProps;

export const TextField = memo(
  forwardRef<RNTextInput, TextFieldProps>(function TextField(props, ref) {
    /* MODE RESOLUTION
     * `useFormikContext` returns undefined when there is no provider in scope,
     * so calling it unconditionally is safe (this matches the existing
     * useFieldContext pattern in this codebase). The resolver decides the mode
     * based on `name` + whether Formik is present + whether value/onChangeText
     * are supplied. */
    const formikContext = useFormikContext();
    const formik: FormikSnapshot | undefined = formikContext ?? undefined;

    const state = resolveTextFieldState(props, formik);

    /* ERROR VISIBILITY
     * Default is 'onTouch': errors only appear after the user blurs the field
     * once, or after the form is submitted. This is a behavior change from the
     * old FormInput, which displayed errors immediately on first keystroke. */
    const showError = shouldShowError(
      state.error,
      state.touched,
      state.submitCount,
      props.errorVisibility ?? 'onTouch',
    );

    const preset = TYPE_PRESETS[props.type ?? 'text'];
    const displayLabel = formatRequiredLabel(
      props.label,
      props.required ?? false,
    );
    const counterText =
      props.showCounter && props.maxLength !== undefined
        ? formatCounter(state.value.length, props.maxLength)
        : undefined;

    return (
      <View>
        <RNPTextInput
          ref={ref}
          mode="flat"
          label={displayLabel}
          placeholder={props.placeholder}
          value={state.value}
          onChangeText={state.onChangeText}
          onBlur={state.onBlur}
          error={showError}
          multiline={props.multiline}
          numberOfLines={props.numberOfLines}
          maxLength={props.maxLength}
          disabled={props.disabled}
          autoFocus={props.autoFocus}
          testID={props.testID}
          accessibilityLabel={props.accessibilityLabel ?? props.label}
          keyboardType={preset.keyboardType}
          autoCapitalize={preset.autoCapitalize}
          autoComplete={preset.autoComplete}
          activeUnderlineColor={theme.colors.input.standard.enabledBorder}
          underlineColor={theme.colors.input.standard.enabledBorder}
          selectionColor={theme.colors.text.primary}
          style={[
            styles.input,
            props.multiline && styles.multilineInput,
            props.disabled && styles.disabledInput,
            props.style,
          ]}
        />

        {/* Bottom row: error replaces helper text; counter renders alongside.
         * All three are left-aligned with the input text via padding="normal". */}
        {showError ? (
          <HelperText type="error" visible padding="normal">
            {state.error}
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
      </View>
    );
  }),
);

const styles = StyleSheet.create({
  input: {
    width: '100%',
    backgroundColor: theme.colors.input.filled.enabledFill,
  },
  multilineInput: {
    minHeight: 100,
  },
  /* Disabled visual: lighter background per Material Design's filled
   * TextField. Paper applies its own dimming to the label, underline, and
   * text content when `disabled` is true; we just lighten the fill on top. */
  disabledInput: {
    backgroundColor: '#F5F5F5',
  },
});
