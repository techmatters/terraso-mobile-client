import {FormControl, Radio, Row, Spacer, Text, useTheme} from 'native-base';
import {View} from 'react-native';

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
  onChange?: (value: Keys) => void;
  value?: Keys;
} & WrapperProps;

type WrapperProps = {
  children?: React.ReactNode;
  oneLine?: boolean;
  gap?: number;
};

function OptionWrapper({children, oneLine = false, gap}: WrapperProps) {
  if (oneLine) {
    return (
      // eslint-disable-next-line react-native/no-inline-styles
      <View style={{gap: gap ?? 26, flexDirection: 'row'}}>{children}</View>
    );
  }
  return <>{children}</>;
}

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
  blockName,
  a11yLabel,
  defaultValue,
  oneLine,
  onChange,
  value,
  gap,
}: Props<T>) {
  return (
    <FormControl>
      <FormControl.Label>{label}</FormControl.Label>
      <Radio.Group
        name={blockName}
        accessibilityLabel={a11yLabel}
        colorScheme="primary"
        defaultValue={defaultValue}
        value={value ?? undefined}
        onChange={onChange as (_: string) => void}>
        <OptionWrapper oneLine={oneLine} gap={gap}>
          {Object.entries<RadioOption>(options).flatMap(
            ([value, {text, isDisabled}]) => [
              <Radio
                key={value}
                value={value}
                my={1}
                size="sm"
                isDisabled={isDisabled}>
                {text}
              </Radio>,
            ],
          )}
        </OptionWrapper>
      </Radio.Group>
    </FormControl>
  );
}
