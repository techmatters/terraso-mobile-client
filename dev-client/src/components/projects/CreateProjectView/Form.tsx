import {HStack, Input, Text, VStack} from 'native-base';
import {Formik, FormikConfig, FormikProps} from 'formik';
import RadioBlock from '../../common/RadioBlock';
import {IconButton} from '../../common/Icons';
import {useTranslation} from 'react-i18next';
import SaveFAB from '../../common/SaveFAB';
import ErrorMessage from '../../common/ErrorMessage';
import * as yup from 'yup';
import {
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_NAME_MAX_LENGTH,
  PROJECT_NAME_MIN_LENGTH,
} from '../../../constants';

const validationSchema = yup.object().shape({
  name: yup
    .string()
    .min(PROJECT_NAME_MIN_LENGTH)
    .max(PROJECT_NAME_MAX_LENGTH)
    .required(),
  description: yup.string().max(PROJECT_DESCRIPTION_MAX_LENGTH),
  privacy: yup.string().oneOf(['PRIVATE', 'PUBLIC']).required(),
});

export interface FormValues {
  name: string;
  description: string;
  privacy: 'PUBLIC' | 'PRIVATE';
}

interface Props {
  onSubmit: FormikConfig<FormValues>['onSubmit'];
}

export default function Form({onSubmit}: Props) {
  const {t} = useTranslation();
  return (
    <Formik
      initialValues={{name: '', description: '', privacy: 'PRIVATE'}}
      onSubmit={onSubmit}
      validationSchema={validationSchema}>
      {({
        handleChange,
        handleBlur,
        handleSubmit,
        values,
        isSubmitting,
      }: FormikProps<FormValues>) => {
        const inputParams = (field: keyof FormValues) => ({
          value: values[field],
          onChangeText: handleChange(field),
          onBlur: handleBlur(field),
        });

        return (
          <>
            <VStack space={3} mx={5}>
              <Input
                placeholder={t('projects.add.name')}
                {...inputParams('name')}
              />
              <ErrorMessage fieldName="name" />
              <Input
                placeholder={t('projects.add.description')}
                {...inputParams('description')}
              />
              <ErrorMessage fieldName="description" />
              <RadioBlock<'PUBLIC' | 'PRIVATE'>
                label={
                  <HStack alignItems="center">
                    <Text>Data Privacy</Text>
                    <IconButton name="info" _icon={{color: 'action.active'}} />
                  </HStack>
                }
                options={{
                  PUBLIC: {text: t('projects.add.public')},
                  PRIVATE: {text: t('projects.add.private')},
                }}
                value={values.privacy}
                onChange={handleChange('privacy')}
                blockName="data-privacy"
              />
              <ErrorMessage fieldName="privacy" />
            </VStack>
            <SaveFAB
              title={t('general.save')}
              onPress={handleSubmit as () => void}
              disabled={isSubmitting}
            />
          </>
        );
      }}
    </Formik>
  );
}
