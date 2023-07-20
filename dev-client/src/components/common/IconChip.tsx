import {Badge, HStack, Text} from 'native-base';
import {Icon} from './Icons';

type Props = {
  iconName: string;
  label: any;
};

export default function IconChip({iconName, label}: Props) {
  return (
    <Badge bg="primary.lightest" borderRadius={10} px={2} py={1}>
      <HStack space={3}>
        <Icon name={iconName} />
        <Text>{label}</Text>
      </HStack>
    </Badge>
  );
}
