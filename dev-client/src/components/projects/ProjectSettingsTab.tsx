import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {Box, Button, FormControl, Input, VStack} from 'native-base';
import {TabRoutes, TabStackParamList} from './constants';
import {useTranslation} from 'react-i18next';
import RadioBlock from '../common/RadioBlock';
import IconLink from '../common/IconLink';

type Props = NativeStackScreenProps<TabStackParamList, TabRoutes.SETTINGS>;

export default function ProjectSettingsTab({
  route: {
    params: {name, description, privacy, downloadLink},
  },
}: Props) {
  const {t} = useTranslation();
  return (
    <VStack p={4} space={3} height="100%">
      <FormControl>
        <FormControl.Label
          _text={{
            fontSize: 'sm',
            bold: true,
            color: 'text.primary',
          }}>
          {t('projects.settings.heading')}
        </FormControl.Label>
        <Input value={name} />
        <FormControl.ErrorMessage>
          {t('projects.settings.name.error')}
        </FormControl.ErrorMessage>
      </FormControl>
      <FormControl>
        <Input value={description} />
        <FormControl.ErrorMessage>
          {t('projects.settings.description.error')}
        </FormControl.ErrorMessage>
      </FormControl>
      <RadioBlock<'private' | 'public'>
        label={t('projects.settings.privacy.label')}
        options={{
          private: {text: t('general.project_private')},
          public: {text: t('general.project_public')},
        }}
        groupProps={{
          variant: 'oneLine',
          name: 'project_privacy',
          accessibilityLabel: t('projects.settings.privacy.a11y_label'),
          defaultValue: privacy,
        }}
      />
      <VStack space={2}>
        <IconLink
          iconName="content-copy"
          underlined={false}
          href={downloadLink}>
          {t('projects.settings.copy_download_link').toUpperCase()}
        </IconLink>
        <IconLink iconName="archive" underlined={false}>
          {t('projects.settings.archive').toUpperCase()}
        </IconLink>
        <IconLink iconName="delete-forever" underlined={false}>
          {t('projects.settings.delete').toUpperCase()}
        </IconLink>
      </VStack>
      <Box flexGrow={3} justifyContent="flex-end">
        <Button alignSelf="flex-end">
          {t('general.save').toLocaleUpperCase()}
        </Button>
      </Box>
    </VStack>
  );
}
