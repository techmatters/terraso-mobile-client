import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  AlertDialog,
  Box,
  Button,
  FormControl,
  Input,
  VStack,
} from 'native-base';
import {TabRoutes, TabStackParamList} from './constants';
import {useTranslation} from 'react-i18next';
import RadioBlock from '../common/RadioBlock';
import IconLink from '../common/IconLink';
import {useRef, useState} from 'react';
import {useDispatch} from '../../model/store';
import {deleteProject} from 'terraso-client-shared/project/projectSlice';
import {useNavigation} from '../../screens/AppScaffold';

type Props = NativeStackScreenProps<TabStackParamList, TabRoutes.SETTINGS>;

export default function ProjectSettingsTab({
  route: {
    params: {name, description, privacy, downloadLink, projectId},
  },
}: Props) {
  const {t} = useTranslation();
  const dispatch = useDispatch();
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
                <Button colorScheme="danger" onPress={triggerDeleteProject}>
                  {t('projects.settings.delete_button')}
                </Button>
              </Button.Group>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog>
      </VStack>
      <Box flexGrow={3} justifyContent="flex-end">
        <Button alignSelf="flex-end">
          {t('general.save').toLocaleUpperCase()}
        </Button>
      </Box>
    </VStack>
  );
}
