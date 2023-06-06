import {Box, Button, HStack, Icon, Text} from 'native-base';
import {useTranslation} from 'react-i18next';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = {
  text: string;
};

export default function AddButton({text}: Props) {
  return (
    <Button bg="primary.main" size="xs">
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
