import {Fab, HStack, Heading, Input, Radio, VStack} from 'native-base';
import {Formik, useFormikContext} from 'formik';
import RadioBlock from 'terraso-mobile-client/components/common/RadioBlock';
import {Icon, IconButton} from 'terraso-mobile-client/components/common/Icons';
import {useTranslation} from 'react-i18next';
import ErrorMessage from 'terraso-mobile-client/components/common/ErrorMessage';
import * as yup from 'yup';
import {
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_NAME_MAX_LENGTH,
  PROJECT_NAME_MIN_LENGTH,
} from 'terraso-mobile-client/constants';
import {TFunction} from 'i18next';
import {
  FormInput,
  FormRadioGroup,
} from 'terraso-mobile-client/components/common/Form';
import {ProjectUpdateMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';

export const projectValidationFields = (t: TFunction) => ({
  name: yup
    .string()
    .min(
      PROJECT_NAME_MIN_LENGTH,
      t('projects.form.name_min_length_error', {
        min: PROJECT_NAME_MIN_LENGTH,
      }),
    )
    .max(
      PROJECT_NAME_MAX_LENGTH,
      t('projects.form.name_max_length_error', {
        max: PROJECT_NAME_MAX_LENGTH,
      }),
    )
    .required(
      t('projects.form.name_min_length_error', {
        min: PROJECT_NAME_MIN_LENGTH,
      }),
    ),
  description: yup.string().max(
    PROJECT_DESCRIPTION_MAX_LENGTH,
    t('projects.form.description_max_length_error', {
      max: PROJECT_DESCRIPTION_MAX_LENGTH,
    }),
  ),
  privacy: yup.string().oneOf(['PRIVATE', 'PUBLIC']).required(),
});

export const projectValidationSchema = (t: TFunction) =>
  yup.object().shape(projectValidationFields(t));

export const editProjectValidationSchema = (t: TFunction) => {
  const fullSchema = projectValidationSchema(t);
  return fullSchema.pick(['name', 'description']).concat(
    yup.object().shape({
      measurementUnits: yup.string().oneOf(['METRIC', 'IMPERIAL']),
    }),
  );
};

export type ProjectFormValues = {
  name: string;
  description: string;
  privacy: 'PUBLIC' | 'PRIVATE';
};

type Props = {
  editForm?: boolean;
};

const SharedFormComponents = (showPlaceholders: boolean, t: TFunction) => {
  return [
    <FormInput
      key="name"
      name="name"
      placeholder={showPlaceholders ? t('projects.add.name') : undefined}
      variant="underlined"
      id="project-form-name"
      label={t('projects.add.name')}
    />,
    <FormInput
      key="description"
      name="description"
      placeholder={showPlaceholders ? t('projects.add.description') : undefined}
      variant="underlined"
      id="project-form-description"
      label={t('projects.add.description')}
    />,
  ];
};

type FormProps = Omit<ProjectUpdateMutationInput, 'id'> & {
  onSubmit: (values: Omit<ProjectUpdateMutationInput, 'id'>) => void;
};

export const EditForm = ({
  onSubmit,
  name,
  description,
  measurementUnits,
}: Omit<FormProps, 'privacy'>) => {
  const {t} = useTranslation();
  return (
    <Formik<Omit<ProjectUpdateMutationInput, 'id'>>
      validationSchema={editProjectValidationSchema(t)}
      initialValues={{name, description, measurementUnits}}
      onSubmit={onSubmit}>
      {({handleSubmit, isValid, isSubmitting}) => (
        <>
          {SharedFormComponents(false, t)}
          <FormRadioGroup
            label={t('projects.settings.measurement_units')}
            name="measurementUnits"
            values={['IMPERIAL', 'METRIC']}
            renderRadio={value => (
              <Radio value={value} key={value}>
                {t('general.measurement_units.' + value)}
              </Radio>
            )}
          />
          <Fab
            onPress={() => handleSubmit()}
            disabled={!isValid || isSubmitting}
            label={t('general.submit').toLocaleUpperCase()}
            renderInPortal={false}
          />
        </>
      )}
    </Formik>
  );
};

export default function Form({editForm = false}: Props) {
  const {t} = useTranslation();
  const {handleChange, handleBlur, values} =
    useFormikContext<ProjectFormValues>();
  const inputParams = (field: keyof ProjectFormValues) => ({
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
      <RadioBlock
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
        groupProps={{
          value: values.privacy,
          variant: 'oneLine',
          onChange: handleChange('privacy'),
          name: 'data-privacy',
        }}
      />
      <ErrorMessage fieldName="privacy" />
    </VStack>
  );
}
