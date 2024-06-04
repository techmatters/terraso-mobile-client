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

import {Radio} from 'native-base';

import {
  FormFieldWrapper,
  Props as FormFieldWrapperProps,
} from 'terraso-mobile-client/components/form/FormFieldWrapper';
import {useFieldContext} from 'terraso-mobile-client/components/form/hooks/useFieldContext';

type Props<T> = {
  values: T[] | readonly T[];
  renderRadio: (value: T) => React.ReactNode;
} & FormFieldWrapperProps &
  Omit<React.ComponentProps<typeof Radio.Group>, 'name'>;

export const FormRadioGroup = memo(
  <T extends string>({values, renderRadio, ...props}: Props<T>) => (
    <FormFieldWrapper {...props}>
      <Radio.Group
        name={props.name!}
        {...useFieldContext(props.name)}
        {...props}>
        {values.map(renderRadio)}
      </Radio.Group>
    </FormFieldWrapper>
  ),
);
