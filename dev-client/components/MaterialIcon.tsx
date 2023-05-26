import {Icon, IconButton} from 'native-base';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = {
  name: string;
  iconButtonProps?: any;
  iconProps?: any;
};

export default function MaterialIcon({
  name,
  iconButtonProps,
  iconProps,
}: Props) {
  let icon = <Icon as={MaterialIcons} name={name} />;
  return <IconButton icon={icon} {...iconButtonProps} _icon={iconProps} />;
}
