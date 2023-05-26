import {
  Box,
  Button,
  HStack,
  Heading,
  Icon,
  Link,
  Text,
  VStack,
} from 'native-base';
import BottomNavigation from './BottomNavigation';
import {useTranslation} from 'react-i18next';
import MaterialIcon from './MaterialIcon';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AppBar from './AppBar';

export default function ProjectListView() {
  const {t} = useTranslation();
  return (
    <VStack display="flex" h="100%">
      <AppBar />
      <VStack m="3" mt="5" flexGrow={1}>
        <Heading size="sm">{t('projects.header')}</Heading>
        <Text>{t('projects.project_info')}</Text>
        <Link _text={{color: 'primary.main'}} alignItems="center" mb="4">
          <MaterialIcon
            name="open-in-new"
            iconProps={{color: 'actions.active'}}
          />
          {t('projects.learn_more')}
        </Link>
        <Box alignItems="flex-start">
          <Button bg="primary.main" size="xs">
            <HStack alignItems="center">
              <Icon
                as={MaterialIcons}
                name="add"
                color="primary.contrast"
                size="sm"
                mr="1"
              />
              <Text
                color="primary.contrast"
                fontSize="xs"
                alignContent="center">
                {t('projects.create_button')}
              </Text>
            </HStack>
          </Button>
        </Box>
      </VStack>
      <BottomNavigation />
    </VStack>
  );
}
