import {Box, FormControl, Input as Input} from 'native-base';
import {useCallback, useMemo, useState} from 'react';

type Props = {
  label?: string;
  onChangeText?: (value: string) => void;
  value?: string;
};

export const TextInput = ({label, onChangeText, value}: Props) => {
  const [localVal, setLocalVal] = useState(value ?? '');

  const onChange = useCallback(
    (newValue: string) => {
      setLocalVal(newValue);
      if (onChangeText) onChangeText(newValue);
    },
    [setLocalVal, onChangeText],
  );

  const embedLabel = useMemo(() => {
    const contentVal = value !== undefined ? value : localVal;
    return contentVal.length > 0;
  }, [value, localVal]);

  const labelOpacity = useMemo(() => {
    return embedLabel ? 100 : 0;
  }, [embedLabel]);

  return (
    <Box
      borderBottomColor="black"
      borderBottomStyle="solid"
      borderBottomWidth="2px"
      backgroundColor="grey.200">
      <FormControl.Label
        _text={{fontSize: '12px', fontWeight: 400}}
        my="0px"
        py="0px"
        opacity={labelOpacity}>
        {label}
      </FormControl.Label>
      <Input
        variant="unstyled"
        placeholder={label}
        onChangeText={onChange}
        mt="0px"
        pt="0px"
      />
    </Box>
  );
};
