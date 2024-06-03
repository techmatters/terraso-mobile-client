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

import {createContext, useCallback, useContext} from 'react';

import {useFormikContext} from 'formik';

type FieldContextType<Name extends string = string, T = string> = {
  name?: Name;
  value?: T;
  onChange?: (_: T) => void;
  onBlur?: () => void;
};

export const FieldContext = createContext<FieldContextType | undefined>(
  undefined,
);

export const useFieldContext = <
  Value = string,
  Name extends string = string,
  FormValues extends Record<Name, any> = Record<Name, any>,
>(
  name?: Name,
): FieldContextType<Name, Value> => {
  const fieldContext = useContext(FieldContext) as
    | FieldContextType<Name, Value>
    | undefined;

  const formikContext = useFormikContext<FormValues>();

  const onChange = useCallback(
    (value: Value) => {
      if (name !== undefined) {
        formikContext.setFieldValue(name, value);
      }
    },
    [formikContext, name],
  );

  return name === undefined
    ? fieldContext!
    : formikContext === undefined
      ? {}
      : {
          name,
          value: formikContext.values[name] as Value,
          onChange,
          onBlur: formikContext.handleBlur(name) as unknown as () => void,
        };
};
