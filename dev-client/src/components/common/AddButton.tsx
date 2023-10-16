import {Button, HStack, Text} from 'native-base';
import {Icon} from 'terraso-mobile-client/components/common/Icons';

type Props = {
  text: string;
  buttonProps?: any;
};

export default function AddButton({text, buttonProps}: Props) {
  return (
    <Button bg="primary.main" size="xs" {...buttonProps}>
      <HStack alignItems="center">
        <Icon name="add" color="primary.contrast" size="sm" mr="1" />
        <Text color="primary.contrast" fontSize="xs" alignContent="center">
          {text.toUpperCase()}
        </Text>
      </HStack>
    </Button>
  );
}
