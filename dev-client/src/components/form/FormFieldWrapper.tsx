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

import {memo} from 'react';
import {FormField} from 'terraso-mobile-client/components/form/FormField';
import {FormLabel} from 'terraso-mobile-client/components/form/FormLabel';
import {ErrorMessage as FormikErrorMessage, useFormikContext} from 'formik';
import {FormControl} from 'native-base';
import {useFieldContext} from 'terraso-mobile-client/components/form/hooks/useFieldContext';

const FormHelperText = memo(
  (props: React.ComponentProps<typeof FormControl.HelperText>) =>
    useFieldContext().name! in useFormikContext().errors ? undefined : (
      <FormControl.HelperText {...props} />
    ),
);

const FormErrorMessage = memo(
  (props: React.ComponentProps<typeof FormControl.ErrorMessage>) => (
    <FormikErrorMessage name={useFieldContext().name!}>
      {msg => (
        <FormControl.ErrorMessage isInvalid {...props}>
          {msg}
        </FormControl.ErrorMessage>
      )}
    </FormikErrorMessage>
  ),
);

export type Props = {
  name?: string;
  label?: string;
  errorMessage?: React.ReactNode;
  helpText?: string;
};

export const FormFieldWrapper = memo(
  ({
    name,
    label,
    errorMessage = <FormErrorMessage />,
    helpText,
    children,
  }: React.PropsWithChildren<Props>) => {
    const wrappedChildren = (
      <>
        {label && <FormLabel>{label}</FormLabel>}
        {children}
        {helpText && <FormHelperText>{helpText}</FormHelperText>}
        {errorMessage}
      </>
    );
    return name !== undefined ? (
      <FormField
        name={name}
        useFormContext={Boolean(label || errorMessage || helpText)}>
        {wrappedChildren}
      </FormField>
    ) : (
      wrappedChildren
    );
  },
);
