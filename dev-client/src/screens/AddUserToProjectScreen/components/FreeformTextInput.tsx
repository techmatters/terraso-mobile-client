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

import {useCallback, useState} from 'react';

import {FormControl, IInputProps, Input} from 'native-base';

type Props = {
  validationFunc: (input: string) => Promise<null | string>;
  placeholder?: string;
  inputProps?: IInputProps;
};

/**
 * A text input that allows the user to directly enter a text string.
 * On submit, the result is validated. If incorrect, an error message
 * is displayed.
 */
export const FreeformTextInput = ({
  validationFunc,
  placeholder,
  inputProps,
}: Props) => {
  const [hasError, setHasError] = useState<null | string>(null);
  const [textValue, setTextValue] = useState<string>('');

  const handleSubmit = useCallback(async () => {
    const validationResults = await validationFunc(textValue);
    if (validationResults !== null) {
      setHasError(validationResults);
    } else {
      setTextValue('');
      setHasError(null);
    }
  }, [validationFunc, textValue, setTextValue]);

  return (
    <FormControl isInvalid={hasError !== null}>
      <Input
        placeholder={placeholder !== undefined ? placeholder : ''}
        onSubmitEditing={handleSubmit}
        onChangeText={text => setTextValue(text)}
        value={textValue}
        {...inputProps}
      />
      <FormControl.ErrorMessage>{hasError}</FormControl.ErrorMessage>
    </FormControl>
  );
};
