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
  labelProps?: {
    variant: 'secondary';
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
  labelProps,
}: Props<T>) {
  return (
    <FormControl>
      <FormControl.Label {...labelProps}>{label}</FormControl.Label>
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
