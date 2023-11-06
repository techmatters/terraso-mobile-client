import {useTranslation} from 'react-i18next';
import {FormInput} from 'terraso-mobile-client/components/common/Form';
import {Box} from 'native-base';
import {useFormikContext} from 'formik';

export type SiteNoteFormInput = {
  content: string;
};

export const SiteNoteForm = () => {
  const {t} = useTranslation();
  const {values, errors, touched, handleChange, handleBlur} =
    useFormikContext<SiteNoteFormInput>();

  return (
    <>
      <Box pt={2} pb={4}>
        <FormInput
          name="content"
          placeholder="Enter your note here"
          value={values.content}
          onChangeText={handleChange('content')}
          onBlur={handleBlur('content')}
          errorMessage={
            touched.content && errors.content ? errors.content : undefined
          }
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </Box>
    </>
  );
};
