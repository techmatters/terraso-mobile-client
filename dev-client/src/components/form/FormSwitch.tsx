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
import {Switch} from 'react-native';

import {
  FormFieldWrapper,
  Props as FormFieldWrapperProps,
} from 'terraso-mobile-client/components/form/FormFieldWrapper';
import {useFieldContext} from 'terraso-mobile-client/components/form/hooks/useFieldContext';
import {Row, Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {theme} from 'terraso-mobile-client/theme';

type Props = FormFieldWrapperProps &
  Omit<React.ComponentProps<typeof Switch>, 'onChange' | 'onValueChange'> & {
    onChange?: (_: boolean) => void;
  };

export const FormSwitch = memo(
  ({onChange: onValueChange, label, value: propsValue, ...props}: Props) => {
    const {value: fieldValue, onChange} = useFieldContext<boolean>(props.name);
    return (
      <FormFieldWrapper errorMessage={null} {...props}>
        <Row justifyContent="flex-start">
          <Switch
            value={propsValue ?? fieldValue}
            onValueChange={onValueChange ?? onChange}
            {...props}
          />
          <Text
            ml="10px"
            mt="5px"
            color={
              props.disabled
                ? theme.colors.text.disabled
                : theme.colors.text.primary
            }>
            {label}
          </Text>
        </Row>
      </FormFieldWrapper>
    );
  },
);
