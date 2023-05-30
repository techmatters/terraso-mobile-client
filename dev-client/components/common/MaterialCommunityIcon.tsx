import {Icon, IconButton} from 'native-base';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

type Props = {
  name: string;
  iconButtonProps?: any;
  iconProps?: any;
};

export default function MaterialCommunityIcon({
  name,
  iconButtonProps,
  iconProps,
}: Props) {
  let icon = <Icon as={MaterialCommunityIcons} name={name} />;
  return <IconButton icon={icon} {...iconButtonProps} _icon={iconProps} />;
}
