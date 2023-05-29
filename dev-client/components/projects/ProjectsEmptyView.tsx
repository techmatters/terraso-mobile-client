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
import {useTranslation} from 'react-i18next';
import MaterialIcon from '../MaterialIcon';
import CreateProjectButton from './CreateProjectButton';

/**
 * Component for displaying info when a user doesn't have any projects
 */
export default function ProjectsEmptyView() {
  const {t} = useTranslation();
  return (
    <VStack m="3" mt="5" flexGrow={1}>
      <Heading size="sm">{t('projects.none.header')}</Heading>
      <Text>{t('projects.none.info')}</Text>
      <Link _text={{color: 'primary.main'}} alignItems="center" mb="4">
        <MaterialIcon
          name="open-in-new"
          iconProps={{color: 'actions.active'}}
        />
        {t('projects.learn_more')}
      </Link>
      <Box alignItems="flex-start">
        <CreateProjectButton />
      </Box>
    </VStack>
  );
}
