import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AlertDialog, Button, VStack} from 'native-base';
import {
  TabRoutes,
  TabStackParamList,
} from 'terraso-mobile-client/components/projects/constants';
import {useTranslation} from 'react-i18next';
import IconLink from 'terraso-mobile-client/components/common/IconLink';
import {useRef, useState} from 'react';
import {useDispatch, useSelector} from 'terraso-mobile-client/model/store';
import {
  deleteProject,
  updateProject,
  archiveProject,
} from 'terraso-client-shared/project/projectSlice';
import {useNavigation} from 'terraso-mobile-client/screens/AppScaffold';
import {EditForm} from 'terraso-mobile-client/components/projects/CreateProjectView/Form';
import {ProjectUpdateMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';

type Props = NativeStackScreenProps<TabStackParamList, TabRoutes.SETTINGS>;

export default function ProjectSettingsTab({
  route: {
    params: {downloadLink, projectId},
  },
}: Props) {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const {name, description, privacy, measurementUnits} = useSelector(
    state => state.project.projects[projectId],
  );

  const onSubmit = async (values: Omit<ProjectUpdateMutationInput, 'id'>) => {
    await dispatch(updateProject({...values, id: projectId, privacy}));
  };

  const navigation = useNavigation();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const cancelRef = useRef(null);
  const closeDeleteProject = () => {
    setIsDeleteModalOpen(false);
  };
  const openDeleteProject = () => {
    setIsDeleteModalOpen(true);
  };
  const triggerDeleteProject = () => {
    setIsDeleteModalOpen(false);
    dispatch(deleteProject({id: projectId}));
    navigation.navigate('PROJECT_LIST');
  };
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const closeArchiveProject = () => {
    setIsArchiveModalOpen(false);
  };
  const openArchiveProject = () => {
    setIsArchiveModalOpen(true);
  };
  const triggerArchiveProject = () => {
    setIsDeleteModalOpen(false);
    dispatch(archiveProject({id: projectId, archived: true}));
    navigation.navigate('PROJECT_LIST');
  };
  return (
    <VStack px={2} py={4} space={2} m={3} height="100%">
      <EditForm
        onSubmit={onSubmit}
        name={name}
        description={description}
        measurementUnits={measurementUnits}
      />
      <VStack space={1}>
        <IconLink
          iconName="content-copy"
          isUnderlined={false}
          href={downloadLink}>
          {t('projects.settings.copy_download_link').toUpperCase()}
        </IconLink>
        <IconLink
          iconName="archive"
          isUnderlined={false}
          onPress={openArchiveProject}>
          {t('projects.settings.archive').toUpperCase()}
        </IconLink>
        <IconLink
          iconName="delete-forever"
          underlined={false}
          onPress={openDeleteProject}>
          {t('projects.settings.delete').toUpperCase()}
        </IconLink>
      </VStack>
      <AlertDialog
        leastDestructiveRef={cancelRef}
        isOpen={isArchiveModalOpen}
        onClose={closeArchiveProject}>
        <AlertDialog.Content>
          <AlertDialog.CloseButton />
          <AlertDialog.Header>
            {t('projects.settings.archive_button_prompt')}
          </AlertDialog.Header>
          <AlertDialog.Body>
            {t('projects.settings.archive_description')}
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button.Group space={2}>
              <Button
                variant="unstyled"
                colorScheme="coolGray"
                onPress={closeArchiveProject}>
                {t('projects.settings.cancel')}
              </Button>
              <Button colorScheme="danger" onPress={triggerArchiveProject}>
                {t('projects.settings.archive_button')}
              </Button>
            </Button.Group>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>
      <AlertDialog
        leastDestructiveRef={cancelRef}
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteProject}>
        <AlertDialog.Content>
          <AlertDialog.CloseButton />
          <AlertDialog.Header>
            {t('projects.settings.delete_button_prompt')}
          </AlertDialog.Header>
          <AlertDialog.Body>
            {t('projects.settings.delete_description')}
          </AlertDialog.Body>
          <AlertDialog.Footer>
            <Button.Group space={2}>
              <Button
                variant="unstyled"
                colorScheme="coolGray"
                onPress={closeDeleteProject}>
                {t('projects.settings.cancel')}
              </Button>
              <Button colorScheme="danger" onPress={triggerDeleteProject}>
                {t('projects.settings.delete_button')}
              </Button>
            </Button.Group>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog>
    </VStack>
  );
}
