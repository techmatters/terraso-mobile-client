import {
  FormControl,
  IRadioGroupProps,
  Radio,
  Row,
  Spacer,
  Text,
  useTheme,
} from 'native-base';

type RadioOption = {
  text: string;
  isDisabled?: boolean;
  helpText?: string;
};

type Props<Keys extends string> = {
  label: string | React.ReactNode;
  options: Record<Keys, RadioOption>;
  allDisabled?: boolean;
  groupProps: Omit<IRadioGroupProps, 'onChange'> & {
    value?: Keys;
    defaultValue?: Keys;
    onChange?: (value: Keys) => void;
  };
};

type IconLabelProps = {
  label: string;
  icon: React.ReactNode;
};
export const IconLabel = ({label, icon}: IconLabelProps) => {
  const {
    components: {FormControlLabel},
  } = useTheme();

  return (
    <Row alignItems="center">
      <Text {...FormControlLabel.baseStyle()._text}>{label}</Text>
      <Spacer size="4px" />
      {icon}
    </Row>
  );
};

export default function RadioBlock<T extends string>({
  label,
  options,
  allDisabled = false,
  groupProps: {onChange, ...radioGroupProps},
}: Props<T>) {
  return (
    <FormControl>
      <FormControl.Label>{label}</FormControl.Label>
      <Radio.Group
        onChange={onChange as (_: string) => void}
        {...radioGroupProps}>
        {Object.entries<RadioOption>(options).flatMap(
          ([value, {text, isDisabled, helpText}]) =>
            [
              <Radio
                key={value}
                value={value}
                isDisabled={isDisabled || allDisabled}>
                {text}
              </Radio>,
              helpText ? (
                <FormControl.HelperText
                  key={helpText + value}
                  ml="15px"
                  mt="-5px">
                  {helpText}
                </FormControl.HelperText>
              ) : undefined,
            ].filter(Boolean),
        )}
      </Radio.Group>
    </FormControl>
  );
}
