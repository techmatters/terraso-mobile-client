import {Box, FormControl, HStack, Radio} from 'native-base';

type RadioOption = {
  text: string;
  isDisabled?: boolean;
};

type Props<Keys extends string> = {
  label: string | React.ReactNode;
  options: Record<Keys, RadioOption>;
  blockName: string;
  a11yLabel?: string;
  defaultValue?: Keys;
  oneLine?: boolean;
  onChange?: (value: Keys) => void;
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

export default function RadioBlock<T extends string>({
  label,
  options,
  blockName,
  a11yLabel,
  defaultValue,
  oneLine = false,
  onChange,
}: Props<T>) {
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
        onChange={onChange as (_: string) => void}>
        <OptionWrapper oneLine={oneLine}>
          {Object.entries<RadioOption>(options).map(
            ([value, {text, isDisabled}]) => (
              <Box key={value} flexGrow={1}>
                <Radio value={value} my={1} size="sm" isDisabled={isDisabled}>
                  {text}
                </Radio>
              </Box>
            ),
          )}
        </OptionWrapper>
      </Radio.Group>
    </FormControl>
  );
}
