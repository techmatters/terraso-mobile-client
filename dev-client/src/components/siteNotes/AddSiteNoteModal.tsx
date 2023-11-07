import {Button, Heading, HStack, Spacer} from 'native-base';
import {Formik} from 'formik';
import {useTranslation} from 'react-i18next';
import {useDispatch} from 'terraso-mobile-client/model/store';
import {SiteNoteForm} from 'terraso-mobile-client/components/siteNotes/SiteNoteForm';
import {useModal} from 'terraso-mobile-client/components/common/Modal';
import * as yup from 'yup';
import {SiteNoteAddMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {addSiteNote} from 'terraso-client-shared/site/siteSlice';
import {SITE_NOTE_MIN_LENGTH} from 'terraso-mobile-client/constants';

type Props = {
  siteId: string;
};

export const AddSiteNoteModal = ({siteId}: Props) => {
  const {t} = useTranslation();
  const onClose = useModal()!.onClose;
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
      onClose();
    }
  };

  return (
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
        const {handleSubmit, isSubmitting} = formikProps;
        return (
          <>
            <Heading variant="h6">{t('site.notes.add_title')}</Heading>
            <SiteNoteForm {...formikProps} />
            <HStack>
              <Spacer />
              <Button onPress={handleSubmit} isDisabled={isSubmitting}>
                {t('site.notes.done_button')}
              </Button>
            </HStack>
          </>
        );
      }}
    </Formik>
  );
};
