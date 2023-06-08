import {Box, Menu, Text, VStack} from 'native-base';
import AddButton from '../common/AddButton';
import {useTranslation} from 'react-i18next';

export default function ProjectSitesTab() {
  const {t} = useTranslation();
  return (
    <VStack m={5} space={3}>
      <Text>{t('projects.sites.empty')}</Text>
      <Menu
        shouldOverlapWithTrigger={false}
        trigger={(props): JSX.Element => {
          return (
            <Box flex={0} alignItems="flex-start">
              <AddButton text={t('projects.sites.add')} buttonProps={props} />
            </Box>
          );
        }}>
        <Menu.Item>{t('projects.sites.create') ?? ''}</Menu.Item>
        <Menu.Item>{t('projects.sites.transfer') ?? ''}</Menu.Item>
      </Menu>
    </VStack>
  );
}
