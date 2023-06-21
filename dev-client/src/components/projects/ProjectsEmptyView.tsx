import {Box, Heading, Link, Text, VStack} from 'native-base';
import {useTranslation} from 'react-i18next';
import MaterialIconButton from '../common/MaterialIconButton';
import AddButton from '../common/AddButton';

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
        <MaterialIconButton
          name="open-in-new"
          iconProps={{color: 'action.active'}}
        />
        {t('projects.learn_more')}
      </Link>
      <Box alignItems="flex-start">
        <AddButton text={t('projects.create')} />
      </Box>
    </VStack>
  );
}
