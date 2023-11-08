import {useTranslation} from 'react-i18next';
import {FormInput} from 'terraso-mobile-client/components/common/Form';
import {Box} from 'native-base';
import {useFormikContext} from 'formik';
import {KeyboardAvoidingView} from 'react-native';

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
        <KeyboardAvoidingView behavior="height">
          <FormInput
            padding={0}
            borderWidth={0}
            backgroundColor={'transparent'}
            name="content"
            placeholder={t('site.notes.placeholder_text')}
            value={values.content}
            onChangeText={handleChange('content')}
            onBlur={handleBlur('content')}
            multiline
            minHeight={500}
            textAlignVertical="top"
          />
        </KeyboardAvoidingView>
      </Box>
    </>
  );
};
