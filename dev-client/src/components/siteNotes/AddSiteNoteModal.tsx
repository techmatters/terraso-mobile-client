import {Button, Heading} from 'native-base';
import {Formik} from 'formik';
import {useTranslation} from 'react-i18next';
import {useDispatch} from 'terraso-mobile-client/model/store';
import {SiteNoteForm} from 'terraso-mobile-client/components/siteNotes/SiteNoteForm';
import {useModal} from 'terraso-mobile-client/components/common/Modal';
import * as yup from 'yup';
import {SiteNoteAddMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {addSiteNote} from 'terraso-client-shared/site/siteSlice';

type Props = {
  siteId: string;
};

export const AddSiteNoteModal = ({siteId}: Props) => {
  const {t} = useTranslation();
  const onClose = useModal()!.onClose;
  const dispatch = useDispatch();

  const notesFormSchema = yup.object().shape({
    content: yup
      .string()
      .required('Note is required')
      .min(2, 'Note is too short'),
  });

  const handleAddNote = async (content: string) => {
    console.log('handleAddNote');
    if (!content.trim()) {
      console.log('note content is empty');
      return;
    }

    try {
      const siteNoteInput: SiteNoteAddMutationInput = {
        siteId,
        content: content,
      };
      const result = await dispatch(addSiteNote(siteNoteInput));
      if (result.payload && 'error' in result.payload) {
        console.log(result.payload.error);
        console.log(result.payload.parsedErrors);
      }
    } catch (error) {
      console.log('Failed to add note:', error);
    } finally {
      onClose();
    }
  };

  return (
    <Formik
      initialValues={{content: ''}}
      validationSchema={notesFormSchema}
      onSubmit={async (values, actions) => {
        console.log('onSubmit');
        actions.setSubmitting(true);
        await handleAddNote(values.content);
        actions.setSubmitting(false);
      }}>
      {formikProps => {
        const {handleSubmit, isSubmitting} = formikProps;
        return (
          <>
            <Heading variant="h6">{t('site.notes.add_title')}</Heading>
            <SiteNoteForm {...formikProps} />
            <Button
              onPress={() => {
                handleSubmit();
              }}
              isDisabled={isSubmitting}>
              Submit
            </Button>
          </>
        );
      }}
    </Formik>
  );
};
