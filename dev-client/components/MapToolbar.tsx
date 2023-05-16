import {VStack} from 'native-base';
import MaterialIcon from './MaterialIcon';

type Props = {
  backgroundColor?: string;
  color?: string;
  iconSize?: string;
};

export default function MapToolbar({
  backgroundColor = 'background',
  color = 'action.active',
  iconSize = 'md',
}: Props) {
  const iconButtonProps = {backgroundColor, size: iconSize};
  const iconProps = {color};
  const props = {iconProps, iconButtonProps};

  return (
    <VStack space={2}>
      <MaterialIcon name="search" {...props} />
      <MaterialIcon name="layers" {...props} />
      <MaterialIcon name="my-location" {...props} />
    </VStack>
  );
}
