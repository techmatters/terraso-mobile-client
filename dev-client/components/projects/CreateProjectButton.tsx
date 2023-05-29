import {Button, HStack, Icon, Text} from 'native-base';
import {useTranslation} from 'react-i18next';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

export default function CreateProjectButton() {
  const {t} = useTranslation();
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
          {t('projects.create_button').toUpperCase()}
        </Text>
      </HStack>
    </Button>
  );
}
