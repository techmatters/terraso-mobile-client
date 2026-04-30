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

import type {TextInputProps as RNTextInputProps} from 'react-native';

import type {FormikContextType} from 'formik';

/*
 * Pure helpers for TextField. These are extracted from the component so they
 * can be unit-tested without rendering or mocking React contexts.
 */

// ────────────────────────────────────────────────────────────────────
// Mode resolution
// ────────────────────────────────────────────────────────────────────
//
// TextField operates in one of three modes. The mode is determined by a
// combination of props and whether a Formik provider exists in context:
//
//   • Formik mode    — `name` is set AND a Formik provider is in scope.
//                      State (value, errors, touched) is read from Formik.
//                      A caller-supplied `onChangeText` runs *after* Formik
//                      updates, so layered side effects work (e.g., the
//                      percent ↔ degree conversion in ManualSteepnessOverlaySheet).
//   • Controlled     — `value` and `onChangeText` are supplied by the caller.
//                      No Formik involved. `error` is whatever the caller passes.
//                      `touched` is treated as true (no Formik to track it).
//   • Bare           — Neither of the above. The component renders as a styled
//                      input but doesn't track state. Useful for layouts/demos.

export type TextFieldMode = 'formik' | 'controlled' | 'bare';

/* The minimal slice of Formik's context that TextField consumes. Narrowing it
 * here keeps the resolver's tests easy: callers can pass a plain object,
 * not a fully-typed Formik provider mock. */
export type FormikSnapshot = Pick<
  FormikContextType<any>,
  | 'values'
  | 'errors'
  | 'touched'
  | 'submitCount'
  | 'setFieldValue'
  | 'handleBlur'
>;

export type StateResolverInput = {
  name?: string;
  value?: string;
  onChangeText?: (value: string) => void;
  onBlur?: () => void;
  error?: string;
};

export type ResolvedState = {
  mode: TextFieldMode;
  value: string;
  onChangeText: (value: string) => void;
  onBlur: () => void;
  error: string | undefined;
  touched: boolean;
  submitCount: number;
};

const NOOP = () => {};

export const resolveTextFieldState = (
  props: StateResolverInput,
  formik: FormikSnapshot | undefined,
): ResolvedState => {
  // Formik mode
  if (props.name !== undefined && formik !== undefined) {
    const name = props.name;
    return {
      mode: 'formik',
      value: ((formik.values as Record<string, unknown>)[name] as string) ?? '',
      onChangeText: (value: string) => {
        formik.setFieldValue(name, value);
        // Layer caller's handler after Formik update so side effects see fresh state.
        props.onChangeText?.(value);
      },
      onBlur: () => {
        // Formik's handleBlur returns a function bound to the field name.
        // The returned function expects a React.FocusEvent; calling without one is safe at runtime.
        (formik.handleBlur(name) as unknown as () => void)();
        props.onBlur?.();
      },
      // Controlled `error` prop overrides Formik's auto-detected error when both are present.
      error:
        props.error ??
        ((formik.errors as Record<string, unknown>)[name] as
          | string
          | undefined),
      touched: Boolean((formik.touched as Record<string, unknown>)[name]),
      submitCount: formik.submitCount,
    };
  }

  // Controlled mode
  if (props.value !== undefined && props.onChangeText !== undefined) {
    return {
      mode: 'controlled',
      value: props.value,
      onChangeText: props.onChangeText,
      onBlur: props.onBlur ?? NOOP,
      error: props.error,
      // No Formik touched-tracking. Caller controls when `error` is set, so
      // we treat the field as touched and let `errorVisibility` decide display.
      touched: true,
      submitCount: 0,
    };
  }

  // Bare mode — nothing wired up
  return {
    mode: 'bare',
    value: props.value ?? '',
    onChangeText: props.onChangeText ?? NOOP,
    onBlur: props.onBlur ?? NOOP,
    error: props.error,
    touched: true,
    submitCount: 0,
  };
};

// ────────────────────────────────────────────────────────────────────
// Error visibility
// ────────────────────────────────────────────────────────────────────
//
// Validation runs continuously in Formik (so `isValid` stays accurate for
// submit-button state). But we only *display* the error once the user has
// blurred the field at least once, or attempted to submit. This avoids
// yelling at the user mid-keystroke.

export type ErrorVisibility = 'onTouch' | 'always';

export const shouldShowError = (
  error: string | undefined,
  touched: boolean,
  submitCount: number,
  visibility: ErrorVisibility,
): boolean => {
  if (!error) return false;
  if (visibility === 'always') return true;
  return touched || submitCount > 0;
};

// ────────────────────────────────────────────────────────────────────
// Type presets
// ────────────────────────────────────────────────────────────────────
//
// Bundles `keyboardType`, `autoCapitalize`, and `autoComplete` so callers
// don't have to remember to set all three for common cases.

export type TextFieldType = 'text' | 'email' | 'numeric';

export type TypePresetValues = {
  keyboardType: RNTextInputProps['keyboardType'];
  autoCapitalize: RNTextInputProps['autoCapitalize'];
  autoComplete?: RNTextInputProps['autoComplete'];
};

export const TYPE_PRESETS: Record<TextFieldType, TypePresetValues> = {
  text: {
    keyboardType: 'default',
    autoCapitalize: 'sentences',
  },
  email: {
    keyboardType: 'email-address',
    autoCapitalize: 'none',
    autoComplete: 'email',
  },
  numeric: {
    keyboardType: 'numeric',
    autoCapitalize: 'none',
  },
};

// ────────────────────────────────────────────────────────────────────
// Display formatters
// ────────────────────────────────────────────────────────────────────

export const formatCounter = (
  currentLength: number,
  maxLength: number,
): string => `${currentLength} / ${maxLength}`;

export const formatRequiredLabel = (
  label: string | undefined,
  required: boolean,
): string | undefined => {
  if (!label) return label;
  return required ? `${label} *` : label;
};
