import {Fab} from 'native-base';

type Props = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
};
export default function SaveFAB({onPress, title, disabled}: Props) {
  return (
    <Fab
      label={title.toUpperCase()}
      px={5}
      borderRadius={3}
      onPress={onPress}
      disabled={disabled}
    />
  );
}
