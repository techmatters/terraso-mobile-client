import {Select} from 'native-base';

type Props = {
  nullableOption: string;
} & React.ComponentProps<typeof Select> &
  React.PropsWithChildren;

export const NullableSelect = ({
  nullableOption,
  children,
  ...selectProps
}: Props) => {
  return (
    <Select {...selectProps}>
      <Select.Item value="" label={nullableOption} />
      {children}
    </Select>
  );
};
