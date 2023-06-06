import {Icon, IconButton} from 'native-base';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type Props = {
  name: string;
  // TODO: Figure out what this type is
  iconButtonProps?: any;
  iconProps?: any;
  onPress?: () => void;
};

export default function MaterialCommunityIcon({
  name,
  iconButtonProps,
  iconProps,
  onPress,
}: Props) {
  let icon = <Icon as={MaterialCommunityIcons} name={name} onPress={onPress} />;
  return <IconButton icon={icon} {...iconButtonProps} _icon={iconProps} />;
}
