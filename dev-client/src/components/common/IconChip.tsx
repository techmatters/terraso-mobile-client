import {Badge, HStack, Text} from 'native-base';
import {Icon} from 'terraso-mobile-client/components/common/Icons';

type Props = {
  iconName: string;
  label: string | number;
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
