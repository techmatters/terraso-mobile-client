import {HStack, Heading, Input, VStack} from 'native-base';
import {Formik, FormikConfig, FormikProps} from 'formik';
import RadioBlock from '../../common/RadioBlock';
import {Icon, IconButton} from '../../common/Icons';
import {useTranslation} from 'react-i18next';
import SaveFAB from '../../common/SaveFAB';
import ErrorMessage from '../../common/ErrorMessage';
import * as yup from 'yup';
import {
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_NAME_MAX_LENGTH,
  PROJECT_NAME_MIN_LENGTH,
} from '../../../constants';
import {ProjectPrivacy} from '../../../types';

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
  initialValues?: FormValues;
  editForm?: boolean;
}

export default function Form({
  onSubmit,
  initialValues,
  editForm = false,
}: Props) {
  const {t} = useTranslation();
  return (
    <Formik
      initialValues={
        initialValues ?? {name: '', description: '', privacy: 'PRIVATE'}
      }
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

        const EditHeader = editForm ? (
          <Heading size="sm">{t('projects.edit.inputHeader')}</Heading>
        ) : (
          <></>
        );

        const pencilIcon = editForm ? <Icon name="edit" ml={2} /> : undefined;

        return (
          <>
            <VStack space={3}>
              {EditHeader}
              <Input
                placeholder={t('projects.add.name')}
                InputLeftElement={pencilIcon}
                {...inputParams('name')}
              />
              <ErrorMessage fieldName="name" />
              <Input
                placeholder={t('projects.add.description')}
                InputLeftElement={pencilIcon}
                {...inputParams('description')}
              />
              <ErrorMessage fieldName="description" />
              <RadioBlock<ProjectPrivacy>
                label={
                  <HStack alignItems="center">
                    <Heading size="sm">Data Privacy</Heading>
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
              aboveNavBar={editForm}
            />
          </>
        );
      }}
    </Formik>
  );
}
