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

import {
  FormFieldWrapper,
  Props as FormFieldWrapperProps,
} from 'terraso-mobile-client/components/form/FormFieldWrapper';
import {useFieldContext} from 'terraso-mobile-client/components/form/hooks/useFieldContext';
import {CircularCheckbox} from 'terraso-mobile-client/components/inputs/CircularCheckbox';

type Props = FormFieldWrapperProps &
  Omit<React.ComponentProps<typeof CircularCheckbox>, 'value'> & {
    value?: boolean;
  };

export const FormCheckbox = memo(({value: isChecked, ...props}: Props) => {
  const {value, onChange} = useFieldContext<boolean>(props.name);
  const checked = isChecked ?? value;
  return (
    <FormFieldWrapper errorMessage={null} {...props}>
      <CircularCheckbox value={checked} onValueChange={onChange} {...props} />
    </FormFieldWrapper>
  );
});
