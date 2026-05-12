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

import {FormikValues, useFormikContext} from 'formik';

import {
  CounterProps,
  SharedTextFieldProps,
  TextField,
} from 'terraso-mobile-client/components/inputs/TextField';
import {shouldShowError} from 'terraso-mobile-client/components/inputs/TextFieldHelpers';

/* FormTextField — thin Formik wrapper around TextField.
 *
 * Reads value / errors / touched / submitCount from the surrounding Formik
 * provider. Decides display via shouldShowError (validate continuously,
 * display on touch by default).
 *
 * onChangeText / onBlur are LAYERED — they run after Formik has updated
 * its own state for this field, and exist for side effects only (e.g.,
 * updating a linked field). Callers do NOT need to call setFieldValue or
 * handleChange for `name` themselves.
 *
 * For async / backend errors, push them into Formik via setFieldError(name,
 * message) so they flow through the same display channel as Yup errors. */

/* Picks keys of T whose value type is assignable to string (after stripping
 * undefined / null). Used to constrain `name` so a caller can't accidentally
 * point FormTextField at a number, boolean, or array field. */
type StringFieldKeys<TValues> = {
  [K in keyof TValues]-?: NonNullable<TValues[K]> extends string
    ? K & string
    : never;
}[keyof TValues];

/* Composed from the same SharedTextFieldProps + CounterProps as TextField, so
 * every display prop is inherited automatically. New display props added to
 * SharedTextFieldProps appear on both components for free; controlled-state
 * props on TextField stay TextField-only by design. */
export type FormTextFieldProps<TValues extends FormikValues> =
  SharedTextFieldProps &
    CounterProps & {
      name: StringFieldKeys<TValues>;
      onChangeText?: (value: string) => void;
      onBlur?: () => void;
    };

/* Generic over the surrounding Formik form's values shape. Callers must
 * specify TValues at the call site (or via a typed alias) so `name` can be
 * checked against their actual field types — see docs/TextField.md for the
 * recommended typed-alias pattern.
 *
 * Note: refs are not forwarded. Imperative access to the input is rare and
 * the generic-plus-forwardRef combination requires fragile type casts. If
 * imperative control is genuinely required, use TextField directly with
 * controlled wiring. */
export const FormTextField = <TValues extends FormikValues>({
  name,
  onChangeText,
  onBlur,
  ...rest
}: FormTextFieldProps<TValues>) => {
  const formik = useFormikContext<TValues>();
  if (!formik) {
    throw new Error('FormTextField must be rendered inside a Formik provider.');
  }

  const value = formik.values[name];
  const error = formik.errors[name] as string | undefined;
  const isTouched = Boolean(formik.touched[name]);

  const showError = shouldShowError(error, isTouched, formik.submitCount);

  const handleChangeText = (next: string) => {
    formik.setFieldValue(name, next);
    onChangeText?.(next);
  };

  const handleBlur = () => {
    formik.setFieldTouched(name, true);
    onBlur?.();
  };

  return (
    <TextField
      {...rest}
      value={(value ?? '') as string}
      onChangeText={handleChangeText}
      onBlur={handleBlur}
      error={showError ? error : undefined}
    />
  );
};
