import {FormControl, IInputProps, Input} from 'native-base';
import {useCallback, useState} from 'react';

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
