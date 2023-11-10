import {Heading, HStack, Spacer, Box, VStack, Button} from 'native-base';
import {Formik} from 'formik';
import {useTranslation} from 'react-i18next';
import {useDispatch} from 'terraso-mobile-client/model/store';
import {SiteNoteForm} from 'terraso-mobile-client/components/siteNotes/SiteNoteForm';
import * as yup from 'yup';
import {SiteNoteAddMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {addSiteNote} from 'terraso-client-shared/site/siteSlice';
import {SITE_NOTE_MIN_LENGTH} from 'terraso-mobile-client/constants';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useNavigation} from 'terraso-mobile-client/screens/AppScaffold';
import {KeyboardAvoidingView} from 'react-native';
import ConfirmModal from 'terraso-mobile-client/components/common/ConfirmModal';
import {HorizontalIconButton} from 'terraso-mobile-client/components/common/Icons';

type Props = {
  siteId: string;
};

export const AddSiteNoteScreen = ({siteId}: Props) => {
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

  const handleAddNote = async (content: string) => {
    if (!content.trim()) {
      return;
    }

    try {
      const siteNoteInput: SiteNoteAddMutationInput = {
        siteId,
        content: content,
      };
      const result = await dispatch(addSiteNote(siteNoteInput));
      if (result.payload && 'error' in result.payload) {
        console.error(result.payload.error);
        console.error(result.payload.parsedErrors);
      }
    } catch (error) {
      console.error('Failed to add note:', error);
    } finally {
      navigation.pop();
    }
  };

  const handleDelete = () => {
    navigation.pop();
  };

  return (
    <ScreenScaffold BottomNavigation={null} AppBar={null}>
      <KeyboardAvoidingView behavior="height">
        <Formik
          initialValues={{content: ''}}
          validationSchema={notesFormSchema}
          onSubmit={async (values, actions) => {
            actions.setSubmitting(true);
            await handleAddNote(values.content).then(() =>
              actions.setSubmitting(false),
            );
          }}>
          {formikProps => {
            const {handleSubmit, isSubmitting, setSubmitting, values} =
              formikProps;
            return (
              <VStack pt={10} pl={5} pr={5} pb={10}>
                <Heading variant="h6" pb={7}>
                  {t('site.notes.add_title')}
                </Heading>
                <SiteNoteForm {...formikProps} />
                <HStack>
                  <Spacer />
                  <ConfirmModal
                    trigger={onOpen => (
                      <Box pt={1} pr={5}>
                        <HorizontalIconButton
                          p={0}
                          name="delete"
                          label={t('general.delete_fab')}
                          textColor="error.main"
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
                    onPress={handleSubmit}
                    isDisabled={isSubmitting}
                    shadow={1}
                    size={'lg'}>
                    {t('general.done_fab')}
                  </Button>
                </HStack>
              </VStack>
            );
          }}
        </Formik>
      </KeyboardAvoidingView>
    </ScreenScaffold>
  );
};
