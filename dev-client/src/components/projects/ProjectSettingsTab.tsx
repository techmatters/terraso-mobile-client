import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {VStack} from 'native-base';
import {TabRoutes, TabStackParamList} from './constants';
import {useTranslation} from 'react-i18next';
import IconLink from '../common/IconLink';
import ProjectSettingsForm, {FormValues} from './CreateProjectView/Form';
import {useDispatch} from '../../model/store';
import {updateProject} from 'terraso-client-shared/project/projectSlice';

type Props = NativeStackScreenProps<TabStackParamList, TabRoutes.SETTINGS>;

export default function ProjectSettingsTab({
  route: {
    params: {name, description, privacy, projectId, downloadLink},
  },
}: Props) {
  const {t} = useTranslation();
  const dispatch = useDispatch();

  const formInitialValues = {name, description, privacy};

  const onSubmit = async (values: FormValues) => {
    await dispatch(updateProject({...values, id: projectId}));
  };

  return (
    <VStack px={2} py={4} space={1} m={3} height="100%">
      <ProjectSettingsForm
        onSubmit={onSubmit}
        initialValues={formInitialValues}
        editForm={true}
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
    </VStack>
  );
}
