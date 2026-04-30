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
import {TextInput as RNTextInput} from 'react-native';

import {useFormikContext} from 'formik';

import {
  CounterProps,
  SharedTextFieldProps,
  TextField,
} from 'terraso-mobile-client/components/inputs/TextField';
import {
  ErrorVisibility,
  shouldShowError,
} from 'terraso-mobile-client/components/inputs/TextField.helpers';

/* FormTextField — thin Formik wrapper around TextField.
 *
 * Reads value / errors / touched / submitCount from the surrounding Formik
 * provider and decides whether to display an error (validate continuously,
 * display on touch by default).
 *
 * onChangeText and onBlur are *layered* — they run after Formik has updated
 * its own state for this field, and exist for side effects only (e.g.,
 * updating a linked field). The caller does NOT need to call setFieldValue
 * or handleChange for `name` — that happens automatically.
 *
 * For async/backend errors, push them into Formik via setFieldError(name,
 * message) so they flow through the same display channel as Yup errors. */

export type FormTextFieldProps = SharedTextFieldProps &
  CounterProps & {
    name: string;
    errorVisibility?: ErrorVisibility;
    onChangeText?: (value: string) => void;
    onBlur?: () => void;
  };

export const FormTextField = memo(
  forwardRef<RNTextInput, FormTextFieldProps>(function FormTextField(
    {name, errorVisibility, onChangeText, onBlur, ...rest},
    ref,
  ) {
    const formik = useFormikContext();

    const values = formik.values as Record<string, string | undefined>;
    const errors = formik.errors as Record<string, string | undefined>;
    const touched = formik.touched as Record<string, boolean | undefined>;

    const value = values[name] ?? '';
    const error = errors[name];
    const isTouched = Boolean(touched[name]);

    const showError = shouldShowError(
      error,
      isTouched,
      formik.submitCount,
      errorVisibility ?? 'onTouch',
    );

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
        ref={ref}
        {...rest}
        value={value}
        onChangeText={handleChangeText}
        onBlur={handleBlur}
        error={showError ? error : undefined}
      />
    );
  }),
);
