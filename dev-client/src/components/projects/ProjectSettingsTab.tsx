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
      <RadioBlock
        label={t('projects.settings.privacy.label')}
        options={[
          {value: 'private', text: t('general.project_private')},
          {value: 'public', text: t('general.project_public')},
        ]}
        blockName={'project_privacy'}
        a11yLabel={t('projects.settings.privacy.a11y_label') ?? undefined}
        defaultValue={privacy}
        oneLine={true}
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
