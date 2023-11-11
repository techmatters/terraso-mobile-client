import {Button, Heading, HStack, Spacer, Box} from 'native-base';
import {Formik} from 'formik';
import {useTranslation} from 'react-i18next';
import {useDispatch} from 'terraso-mobile-client/model/store';
import {SiteNoteForm} from 'terraso-mobile-client/components/siteNotes/SiteNoteForm';
import {ProjectUpdateMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {
  updateProject,
  Project,
} from 'terraso-client-shared/project/projectSlice';
import {HorizontalIconButton} from 'terraso-mobile-client/components/common/Icons';
import ConfirmModal from 'terraso-mobile-client/components/common/ConfirmModal';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useNavigation} from 'terraso-mobile-client/screens/AppScaffold';
import {Keyboard, KeyboardAvoidingView, Platform} from 'react-native';

type Props = {
  project: Project;
};

export const EditProjectInstructionsScreen = ({project}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const handleUpdateProject = async (content: string) => {
    Keyboard.dismiss();
    try {
      const projectInput: ProjectUpdateMutationInput = {
        id: project.id,
        siteInstructions: content,
      };
      const result = await dispatch(updateProject(projectInput));
      if (result.payload && 'error' in result.payload) {
        console.error(result.payload.error);
        console.error(result.payload.parsedErrors);
      }
    } catch (error) {
      console.error('Failed to update project:', error);
    } finally {
      navigation.pop();
    }
  };

  const handleDelete = async (
    setSubmitting: (isSubmitting: boolean) => void,
  ) => {
    Keyboard.dismiss();
    setSubmitting(true);
    await handleUpdateProject('');
    setSubmitting(false);
  };

  return (
    <ScreenScaffold BottomNavigation={null} AppBar={null}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        // eslint-disable-next-line react-native/no-inline-styles
        style={{flex: 1}}>
        <Box pt={10} pl={5} pr={5} pb={10} flex={1}>
          <Formik
            initialValues={{content: project.siteInstructions}}
            onSubmit={async (values, actions) => {
              actions.setSubmitting(true);
              await handleUpdateProject(values.content || '').then(() =>
                actions.setSubmitting(false),
              );
            }}>
            {formikProps => {
              const {handleSubmit, setSubmitting, isSubmitting, values} =
                formikProps;

              return (
                <>
                  <Heading variant="h6" pb={7}>
                    {t('projects.inputs.instructions.title')}
                  </Heading>
                  <Box flexGrow={1}>
                    <SiteNoteForm
                      content={formikProps.values.content || ''}
                      onChangeContent={formikProps.handleChange('content')}
                      onBlurContent={formikProps.handleBlur('content')}
                    />
                  </Box>
                  <HStack pb={4}>
                    <Spacer />
                    <ConfirmModal
                      trigger={onOpen => (
                        <Box pt={1} pr={5}>
                          <HorizontalIconButton
                            p={0}
                            name="delete"
                            label={t('general.delete_fab')}
                            colorScheme="error.main"
                            _icon={{
                              color: 'error.main',
                              size: '5',
                            }}
                            isDisabled={isSubmitting}
                            onPress={() => {
                              if (values.content) {
                                onOpen();
                              } else {
                                handleDelete(setSubmitting);
                              }
                            }}
                          />
                        </Box>
                      )}
                      title={t('site.notes.confirm_removal_title')}
                      body={t('site.notes.confirm_removal_body')}
                      actionName={t('general.delete_fab')}
                      handleConfirm={() => {
                        handleDelete(setSubmitting);
                      }}
                    />
                    <Button
                      onPress={() => handleSubmit()}
                      isDisabled={isSubmitting}
                      shadow={1}
                      size={'lg'}>
                      {t('general.done_fab')}
                    </Button>
                  </HStack>
                </>
              );
            }}
          </Formik>
        </Box>
      </KeyboardAvoidingView>
    </ScreenScaffold>
  );
};
