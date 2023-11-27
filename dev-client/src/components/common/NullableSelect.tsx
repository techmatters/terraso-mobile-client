import {Select} from 'native-base';
import {useCallback} from 'react';

type Props = {
  nullableOption: string;
  onValueChange: (newValue: string | undefined) => void;
} & Omit<React.ComponentProps<typeof Select>, 'onValueChange'> &
  React.PropsWithChildren;

export const NullableSelect = ({
  nullableOption,
  children,
  onValueChange,
  ...selectProps
}: Props) => {
  const changeWrapper = useCallback(
    (newValue: string) => {
      newValue === '' ? onValueChange(undefined) : onValueChange(newValue);
    },
    [onValueChange],
  );

  return (
    <Select {...selectProps} onValueChange={changeWrapper}>
      <Select.Item value="" label={nullableOption} />
      {children}
    </Select>
  );
};
