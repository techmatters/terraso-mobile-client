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

import {Input} from 'native-base';
import {memo, useRef, useImperativeHandle, forwardRef} from 'react';
import {TextInput} from 'react-native';
import {
  Props as FormFieldWrapperProps,
  FormFieldWrapper,
} from 'terraso-mobile-client/components/form/FormFieldWrapper';
import {useFieldContext} from 'terraso-mobile-client/components/form/hooks/useFieldContext';

type Props = FormFieldWrapperProps & React.ComponentProps<typeof Input>;

export const FormInput = memo(
  forwardRef(({value, onChangeText, onBlur, ...props}: Props, ref) => {
    const field = useFieldContext(props.name);
    const inputRef = useRef<TextInput>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      },
    }));

    return (
      <FormFieldWrapper {...props}>
        <Input
          ref={inputRef}
          value={value ?? field.value}
          onChangeText={onChangeText ?? field.onChange}
          onBlur={onBlur ?? field.onBlur}
          {...props}
        />
      </FormFieldWrapper>
    );
  }),
);
