/*
 * Copyright © 2023 Technology Matters
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

import Switch, {
  SharedSwitchProps,
} from 'terraso-mobile-client/components/inputs/Switch';

/* FormSwitch — use instead of Switch when in a Formik form.
 *
 * Formik state is the only source of truth for the switch position; there is
 * no display-only override. A switch that must show "on" regardless of user
 * input belongs in the form's initial values. */

/* Picks keys of T whose value type is assignable to boolean (after stripping
 * undefined / null). Used to constrain `name` so a caller can't accidentally
 * point FormSwitch at a string, number, or array field. */
type BooleanFieldKeys<TValues> = {
  [K in keyof TValues]-?: NonNullable<TValues[K]> extends boolean
    ? K & string
    : never;
}[keyof TValues];

/* Composed from the same SharedSwitchProps as Switch, so every display prop is
 * inherited automatically. */
export type FormSwitchProps<TValues extends FormikValues> =
  SharedSwitchProps & {
    name: BooleanFieldKeys<TValues>;

    // Optional onValueChange runs after FormSwitch has already updated Formik state for `name` — callers should NOT call setFieldValue(name, ...) themselves.
    onValueChange?: (value: boolean) => void;
  };

/* Generic over the surrounding Formik form's values shape. Callers must
 * specify TValues at the call site (or via a typed alias) so `name` can be
 * checked against their actual field types. */
export const FormSwitch = <TValues extends FormikValues>({
  name,
  onValueChange,
  ...rest
}: FormSwitchProps<TValues>) => {
  const formik = useFormikContext<TValues>();
  if (!formik) {
    throw new Error('FormSwitch must be rendered inside a Formik provider.');
  }

  const handleValueChange = (next: boolean) => {
    formik.setFieldValue(name, next);
    onValueChange?.(next);
  };

  return (
    <Switch
      {...rest}
      value={Boolean(formik.values[name])}
      onValueChange={handleValueChange}
    />
  );
};
