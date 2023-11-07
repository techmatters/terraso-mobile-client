import {useTranslation} from 'react-i18next';
import {FormInput} from 'terraso-mobile-client/components/common/Form';
import {Box} from 'native-base';
import {useFormikContext} from 'formik';

export type SiteNoteFormInput = {
  content: string;
};

export const SiteNoteForm = () => {
  const {t} = useTranslation();
  const {values, handleChange, handleBlur} =
    useFormikContext<SiteNoteFormInput>();

  return (
    <>
      <Box pt={2} pb={4}>
        <FormInput
          name="content"
          placeholder={t('site.notes.placeholder_text')}
          value={values.content}
          onChangeText={handleChange('content')}
          onBlur={handleBlur('content')}
          multiline
          numberOfLines={15}
          textAlignVertical="top"
        />
      </Box>
    </>
  );
};
