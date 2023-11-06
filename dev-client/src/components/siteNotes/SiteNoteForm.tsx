import {useTranslation} from 'react-i18next';
import {FormInput} from 'terraso-mobile-client/components/common/Form';
import {Box, Text} from 'native-base';
import {useFormikContext} from 'formik';
import {KeyboardAvoidingView, TextInput} from 'react-native';
import {useRef, useEffect} from 'react';

export type SiteNoteFormInput = {
  content: string;
};

export const SiteNoteForm = () => {
  const {t} = useTranslation();
  const {values, handleChange, handleBlur} =
    useFormikContext<SiteNoteFormInput>();
  const formInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (formInputRef.current) {
      formInputRef.current.focus();
    }
  }, []);

  return (
    <>
      <Box pt={2} pb={4}>
        <KeyboardAvoidingView behavior="height">
          <FormInput
            ref={formInputRef}
            padding={0}
            borderWidth={0}
            backgroundColor={'transparent'}
            name="content"
            placeholder={t('site.notes.placeholder_text')}
            value={values.content}
            onChangeText={handleChange('content')}
            onBlur={handleBlur('content')}
            multiline
            textAlignVertical="top"
          />
        </KeyboardAvoidingView>
      </Box>
    </>
  );
};
