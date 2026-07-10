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
  SharedTextFieldProps,
  TextField,
} from 'terraso-mobile-client/components/inputs/TextField';

/* FormTextField — use instead of TextField when in a Formik form.
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

/* Composed from the same SharedTextFieldProps as TextField, so every display
 * prop is inherited automatically.
 */
export type FormTextFieldProps<TValues extends FormikValues> =
  SharedTextFieldProps & {
    name: StringFieldKeys<TValues>;

    // Optional onChangeText runs after FormTextField  has already updated  Formik state for `name` — callers should NOT call setFieldValue(name, ...) themselves.
    onChangeText?: (value: string) => void;
  };

/* Generic over the surrounding Formik form's values shape. Callers must
 * specify TValues at the call site (or via a typed alias) so `name` can be
 * checked against their actual field types.
 *
 * Note: refs are not forwarded. Imperative access to the input is rare and
 * the generic-plus-forwardRef combination requires fragile type casts. If
 * imperative control is genuinely required, use TextField directly with
 * controlled wiring. */
export const FormTextField = <TValues extends FormikValues>({
  name,
  onChangeText,
  errorTiming,
  ...rest
}: FormTextFieldProps<TValues>) => {
  const formik = useFormikContext<TValues>();
  if (!formik) {
    throw new Error('FormTextField must be rendered inside a Formik provider.');
  }

  const value = formik.values[name];
  const rawError = formik.errors[name];
  if (rawError !== undefined && typeof rawError !== 'string') {
    console.error(
      `Formik error for ${name} should be string | undefined, got:`,
      rawError,
    );
  }
  const error = typeof rawError === 'string' ? rawError : undefined;

  const handleChangeText = (next: string) => {
    formik.setFieldValue(name, next);
    onChangeText?.(next);
  };

  return (
    <TextField
      {...rest}
      value={(value ?? '') as string}
      onChangeText={handleChangeText}
      error={error}
      /* Generally forms will disable their submit buttons if there are errors. But just in case, mae sure we show errors after form submit. */
      errorTiming={formik.submitCount > 0 ? 'immediate' : errorTiming}
    />
  );
};
