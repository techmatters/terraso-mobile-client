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

import {forwardRef, memo, useImperativeHandle, useRef} from 'react';
import {TextInput as RNTextInput} from 'react-native';

import {
  FormFieldWrapper,
  Props as FormFieldWrapperProps,
} from 'terraso-mobile-client/components/form/FormFieldWrapper';
import {useFieldContext} from 'terraso-mobile-client/components/form/hooks/useFieldContext';
import {TextInput} from 'terraso-mobile-client/components/inputs/TextInput';
import {theme} from 'terraso-mobile-client/theme';

export type FormInputProps = {
  textInputLabel?: string;
};

type Props = FormFieldWrapperProps &
  FormInputProps &
  React.ComponentProps<typeof TextInput>;

export const FormInput = memo(
  forwardRef((props: Props, ref) => {
    const {value, onChange, onBlur} = useFieldContext(props.name);
    const inputRef = useRef<RNTextInput>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      },
    }));

    return (
      <FormFieldWrapper {...props}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChange}
          onBlur={onBlur}
          label={props?.textInputLabel}
          cursorColor={theme.colors.primary.main}
          {...props}
        />
      </FormFieldWrapper>
    );
  }),
);
