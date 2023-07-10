import {Box, FormControl, HStack, Radio} from 'native-base';

type RadioOption = {
  value: string;
  text: string;
};

type Props = {
  label: string | React.ReactNode;
  options: RadioOption[];
  blockName: string;
  a11yLabel?: string;
  defaultValue?: string;
  oneLine?: boolean;
  onChange?: (string) => void;
};

type WrapperProps = {
  children?: React.ReactNode;
  oneLine: boolean;
};

function OptionWrapper({children, oneLine}: WrapperProps) {
  if (oneLine) {
    return (
      <HStack alignContent="space-around" mx={4}>
        {children}
      </HStack>
    );
  }
  return <>{children}</>;
}

export default function RadioBlock({
  label,
  options,
  blockName,
  a11yLabel,
  defaultValue,
  oneLine = false,
  onChange,
}: Props) {
  return (
    <FormControl>
      <FormControl.Label
        _text={{
          fontSize: 'sm',
          bold: true,
          color: 'text.primary',
        }}>
        {label}
      </FormControl.Label>
      <Radio.Group
        name={blockName}
        accessibilityLabel={a11yLabel}
        colorScheme="primary"
        defaultValue={defaultValue}
        onChange={onChange}>
        <OptionWrapper oneLine={oneLine}>
          {options.map(({value, text}) => (
            <Box key={value} flexGrow={1}>
              <Radio value={value} my={1} size="sm">
                {text}
              </Radio>
            </Box>
          ))}
        </OptionWrapper>
      </Radio.Group>
    </FormControl>
  );
}
