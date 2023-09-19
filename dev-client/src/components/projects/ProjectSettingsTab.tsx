import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AlertDialog, Button, VStack, ScrollView, Fab} from 'native-base';
import {TabRoutes, TabStackParamList} from './constants';
import {useTranslation} from 'react-i18next';
import IconLink from '../common/IconLink';
import {useMemo, useRef, useState} from 'react';
import {useDispatch} from '../../model/store';
import {
  deleteProject,
  updateProject,
  archiveProject,
} from 'terraso-client-shared/project/projectSlice';
import {useNavigation} from '../../screens/AppScaffold';
import ProjectSettingsForm, {
  ProjectFormValues,
  projectValidationSchema,
} from './CreateProjectView/Form';
import {Formik} from 'formik';

type Props = NativeStackScreenProps<TabStackParamList, TabRoutes.SETTINGS>;

export default function ProjectSettingsTab({
  route: {
    params: {name, description, privacy, downloadLink, projectId},
  },
}: Props) {
  const {t} = useTranslation();
  const dispatch = useDispatch();

  const formInitialValues = {name, description, privacy};
  const onSubmit = async (values: ProjectFormValues) => {
    await dispatch(updateProject({...values, id: projectId}));
  };
  const validationSchema = useMemo(() => projectValidationSchema(t), [t]);

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
    <Formik
      initialValues={formInitialValues}
      onSubmit={onSubmit}
      validationSchema={validationSchema}>
      {({handleSubmit, isSubmitting}) => (
        <>
          <ScrollView>
            <VStack px={2} py={4} space={1} m={3} h="100%">
              <ProjectSettingsForm editForm={true} />
              <IconLink
                iconName="content-copy"
                underlined={false}
                href={downloadLink}>
                {t('projects.settings.copy_download_link').toUpperCase()}
              </IconLink>
              <IconLink
                iconName="archive"
                underlined={false}
                onPress={openArchiveProject}>
                {t('projects.settings.archive').toUpperCase()}
              </IconLink>
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
                      <Button
                        colorScheme="danger"
                        onPress={triggerArchiveProject}>
                        {t('projects.settings.archive_button')}
                      </Button>
                    </Button.Group>
                  </AlertDialog.Footer>
                </AlertDialog.Content>
              </AlertDialog>
              <IconLink
                iconName="delete-forever"
                underlined={false}
                onPress={openDeleteProject}>
                {t('projects.settings.delete').toUpperCase()}
              </IconLink>
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
                      <Button
                        colorScheme="danger"
                        onPress={triggerDeleteProject}>
                        {t('projects.settings.delete_button')}
                      </Button>
                    </Button.Group>
                  </AlertDialog.Footer>
                </AlertDialog.Content>
              </AlertDialog>
            </VStack>
          </ScrollView>
          <Fab
            label={t('general.save_fab')}
            onPress={() => handleSubmit()}
            disabled={isSubmitting}
            renderInPortal={false}
          />
        </>
      )}
    </Formik>
  );
}
