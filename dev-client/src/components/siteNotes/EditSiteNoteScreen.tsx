import {useCallback} from 'react';
import {Button, Heading, HStack, Spacer, Box} from 'native-base';
import {Formik} from 'formik';
import {useTranslation} from 'react-i18next';
import {useDispatch} from 'terraso-mobile-client/model/store';
import {SiteNoteForm} from 'terraso-mobile-client/components/siteNotes/SiteNoteForm';
import * as yup from 'yup';
import {SiteNoteUpdateMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {
  updateSiteNote,
  deleteSiteNote,
  SiteNote,
} from 'terraso-client-shared/site/siteSlice';
import {HorizontalIconButton} from 'terraso-mobile-client/components/common/Icons';
import ConfirmModal from 'terraso-mobile-client/components/common/ConfirmModal';
import {SITE_NOTE_MIN_LENGTH} from 'terraso-mobile-client/constants';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useNavigation} from 'terraso-mobile-client/screens/AppScaffold';
import {Keyboard, KeyboardAvoidingView, Platform} from 'react-native';

type Props = {
  note: SiteNote;
};

export const EditSiteNoteScreen = ({note}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const notesFormSchema = yup.object().shape({
    content: yup.string().required(
      t('site.notes.min_length_error', {
        min: SITE_NOTE_MIN_LENGTH,
      }),
    ),
  });

  const handleUpdateNote = async (content: string) => {
    if (!content.trim()) {
      return;
    }
    Keyboard.dismiss();
    try {
      const siteNoteInput: SiteNoteUpdateMutationInput = {
        id: note.id,
        content: content,
      };
      const result = await dispatch(updateSiteNote(siteNoteInput));
      if (result.payload && 'error' in result.payload) {
        console.error(result.payload.error);
        console.error(result.payload.parsedErrors);
      }
    } catch (error) {
      console.error('Failed to update note:', error);
    } finally {
      navigation.pop();
    }
  };

  const handleDelete = useCallback(
    async (setSubmitting: (isSubmitting: boolean) => void) => {
      setSubmitting(true);
      await dispatch(deleteSiteNote(note)).then(() => navigation.pop());
      setSubmitting(false);
    },
    [navigation, dispatch, note],
  );

  return (
    <ScreenScaffold BottomNavigation={null} AppBar={null}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} // Handle platform-specific keyboard avoidance
        // eslint-disable-next-line react-native/no-inline-styles
        style={{flex: 1}}>
        <Box pt={10} pl={5} pr={5} pb={10} flex={1}>
          <Formik
            initialValues={{content: note.content}}
            validationSchema={notesFormSchema}
            onSubmit={async (values, actions) => {
              actions.setSubmitting(true);
              await handleUpdateNote(values.content).then(() =>
                actions.setSubmitting(false),
              );
            }}>
            {formikProps => {
              const {handleSubmit, isSubmitting, setSubmitting, values} =
                formikProps;

              return (
                <>
                  <Heading variant="h6" pb={7}>
                    {t('site.notes.add_title')}
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
