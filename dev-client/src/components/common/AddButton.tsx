import {Button, HStack, Icon, Text} from 'native-base';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = {
  text: string;
  buttonProps?: any;
};

export default function AddButton({text, buttonProps}: Props) {
  return (
    <Button bg="primary.main" size="xs" {...buttonProps}>
      <HStack alignItems="center">
        {/* TODO: MaterialIcon needs to be renamed to MaterialIconButton */}
        <Icon
          as={MaterialIcons}
          name="add"
          color="primary.contrast"
          size="sm"
          mr="1"
        />
        <Text color="primary.contrast" fontSize="xs" alignContent="center">
          {text.toUpperCase()}
        </Text>
      </HStack>
    </Button>
  );
}
