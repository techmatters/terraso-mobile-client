import {Fab} from 'native-base';
import {BOTTOM_BAR_SIZE} from '../../constants';

type Props = {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  aboveNavBar?: boolean;
};
export default function SaveFAB({
  onPress,
  title,
  disabled,
  aboveNavBar = false,
}: Props) {
  const positionProps = {bottom: aboveNavBar ? BOTTOM_BAR_SIZE : undefined};

  return (
    <Fab
      label={title.toUpperCase()}
      px={5}
      borderRadius={3}
      onPress={onPress}
      disabled={disabled}
      {...positionProps}
    />
  );
}
