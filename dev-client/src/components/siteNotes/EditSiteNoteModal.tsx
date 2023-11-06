import {Button, Heading, HStack, Spacer} from 'native-base';
import {Formik} from 'formik';
import {useTranslation} from 'react-i18next';
import {useCallback} from 'react';
import {useDispatch} from 'terraso-mobile-client/model/store';
import {SiteNoteForm} from 'terraso-mobile-client/components/siteNotes/SiteNoteForm';
import {useModal} from 'terraso-mobile-client/components/common/Modal';
import * as yup from 'yup';
import {SiteNoteUpdateMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {
  updateSiteNote,
  deleteSiteNote,
  SiteNote,
} from 'terraso-client-shared/site/siteSlice';

type Props = {
  note: SiteNote;
};

export const EditSiteNoteModal = ({note}: Props) => {
  const {t} = useTranslation();
  const onClose = useModal()!.onClose;
  const dispatch = useDispatch();

  const notesFormSchema = yup.object().shape({
    content: yup
      .string()
      .required('Note is required')
      .min(2, 'Note is too short'),
  });

  const handleUpdateNote = async (content: string) => {
    console.log('handleUpdateNote');
    if (!content.trim()) {
      console.log('note content is empty');
      return;
    }

    try {
      const siteNoteInput: SiteNoteUpdateMutationInput = {
        id: note.id,
        content: content,
      };
      const result = await dispatch(updateSiteNote(siteNoteInput));
      if (result.payload && 'error' in result.payload) {
        console.log(result.payload.error);
        console.log(result.payload.parsedErrors);
      }
    } catch (error) {
      console.log('Failed to update note:', error);
    } finally {
      onClose();
    }
  };

  const handleDelete = useCallback(
    async note => {
      await dispatch(deleteSiteNote(note));
    },
    [dispatch],
  );

  return (
    <Formik
      initialValues={{content: note.content}}
      validationSchema={notesFormSchema}
      onSubmit={async (values, actions) => {
        console.log('onSubmit');
        actions.setSubmitting(true);
        await handleUpdateNote(values.content);
        actions.setSubmitting(false);
      }}>
      {formikProps => {
        const {handleSubmit, isSubmitting} = formikProps;
        return (
          <>
            <Heading variant="h6">{t('site.notes.add_title')}</Heading>
            <SiteNoteForm {...formikProps} />
            <HStack>
              <Button
                onPress={() => {
                  handleDelete(note);
                }}
                isDisabled={isSubmitting}>
                Delete
              </Button>
              <Spacer />
              <Button onPress={handleSubmit} isDisabled={isSubmitting}>
                Submit
              </Button>
            </HStack>
          </>
        );
      }}
    </Formik>
  );
};
