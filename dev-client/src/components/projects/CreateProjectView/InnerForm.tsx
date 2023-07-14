import {HStack, Input, Text, VStack} from 'native-base';
import {
  ErrorMessage,
  Formik,
  FormikBag,
  FormikConfig,
  FormikProps,
} from 'formik';
import RadioBlock from '../../common/RadioBlock';
import validationSchema from './validation';
import {IconButton} from '../../common/Icons';
import {useTranslation} from 'react-i18next';
import SaveFAB from '../../common/SaveFAB';

export interface FormValues {
  name: string;
  description: string;
  privacy: 'PUBLIC' | 'PRIVATE';
}

interface Props {
  onSubmit?: FormikConfig<FormValues>['onSubmit'];
}

type ErrorProps = {
  field: keyof FormValues;
};

export default function InnerForm({
  onSubmit = values => console.debug(values),
}: Props) {
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

        const LandPKSError = ({field}: ErrorProps) => {
          return (
            <ErrorMessage name={field}>
              {msg => <Text color="error.main">{msg}</Text>}
            </ErrorMessage>
          );
        };
        return (
          <>
            <VStack space={3} mx={5}>
              <Input
                placeholder={t('projects.add.name')}
                {...inputParams('name')}
              />
              <LandPKSError field="name" />
              <Input
                placeholder={t('projects.add.description')}
                {...inputParams('description')}
              />
              <LandPKSError field="description" />
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
              <LandPKSError field="privacy" />
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
