import {Button, Heading, HStack, Spacer, Box} from 'native-base';
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
import {IconButton} from 'terraso-mobile-client/components/common/Icons';
import ConfirmModal from 'terraso-mobile-client/components/common/ConfirmModal';
import {SITE_NOTE_MIN_LENGTH} from 'terraso-mobile-client/constants';

type Props = {
  note: SiteNote;
};

export const EditSiteNoteModal = ({note}: Props) => {
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
              <Spacer />
              <ConfirmModal
                trigger={onOpen => (
                  <Box pt={1} pr={5}>
                    <IconButton
                      p={0}
                      name="delete"
                      label={t('site.notes.delete_button')}
                      textColor="red.700"
                      _icon={{
                        color: 'red.700',
                        size: '5',
                      }}
                      isDisabled={isSubmitting}
                      onPress={onOpen}
                    />
                  </Box>
                )}
                title={t('site.notes.confirm_removal_title')}
                body={t('site.notes.confirm_removal_body')}
                actionName={t('site.notes.confirm_removal_action')}
                handleConfirm={() => {
                  handleDelete(note);
                }}
              />
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
