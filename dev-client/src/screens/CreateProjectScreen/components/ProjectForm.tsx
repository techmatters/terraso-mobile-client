/*
 * Copyright © 2023 Technology Matters
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see https://www.gnu.org/licenses/.
 */

import {useTranslation} from 'react-i18next';

import {Formik, FormikProps} from 'formik';
import {TFunction} from 'i18next';
import {Button} from 'native-base';
import * as yup from 'yup';

import {
  ProjectMembershipProjectRoleChoices,
  ProjectUpdateMutationInput,
} from 'terraso-client-shared/graphqlSchema/graphql';

import {HelpContentSpacer} from 'terraso-mobile-client/components/content/HelpContentSpacer';
import {FormInput} from 'terraso-mobile-client/components/form/FormInput';
import {TextInput} from 'terraso-mobile-client/components/inputs/TextInput';
import {
  Box,
  Column,
  Heading,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RadioBlock} from 'terraso-mobile-client/components/RadioBlock';
import {DataPrivacyInfoSheetButton} from 'terraso-mobile-client/components/sheets/privacy/DataPrivacyInfoSheetButton';
import {
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_DESCRIPTION_MIN_LENGTH,
  PROJECT_NAME_MAX_LENGTH,
  PROJECT_NAME_MIN_LENGTH,
} from 'terraso-mobile-client/constants';
import ErrorMessage from 'terraso-mobile-client/screens/CreateProjectScreen/components/ErrorMessage';

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
    .required(t('general.required')),
  description: yup
    .string()
    .min(
      PROJECT_DESCRIPTION_MIN_LENGTH,
      t('projects.form.description_min_length_error', {
        max: PROJECT_DESCRIPTION_MIN_LENGTH,
      }),
    )
    .max(
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
  return fullSchema.pick(['name', 'description']);
};

export type ProjectFormValues = {
  name: string;
  description: string;
  privacy: 'PUBLIC' | 'PRIVATE';
};

type Props = {
  editForm?: boolean;
};

type FormValues = Omit<ProjectUpdateMutationInput, 'id'>;

type FormProps = FormValues & {
  onSubmit: (values: FormValues) => void;
  userRole: ProjectMembershipProjectRoleChoices | null;
};

export const EditProjectForm = ({
  onSubmit,
  name,
  description,
  userRole,
}: Omit<FormProps, 'privacy'>) => {
  const {t} = useTranslation();

  // We are using a special textInputLabel prop instead of label. This is passed
  // from FormInput to TextInput.
  //
  // If label is present, Formik adds a label above the text field.
  // If label is absent, then TextInput doesn't get a needed label.
  return (
    <Formik<FormValues>
      validationSchema={editProjectValidationSchema(t)}
      initialValues={{name, description}}
      validateOnMount={true}
      onSubmit={onSubmit}>
      {({handleSubmit, isValid, isSubmitting}) => (
        <>
          <FormInput
            key="name"
            name="name"
            maxLength={PROJECT_NAME_MAX_LENGTH}
            placeholder={t('projects.create.name_label')}
            id="project-form-name"
            textInputLabel={t('projects.create.name_label')}
          />
          <FormInput
            key="description"
            name="description"
            maxLength={PROJECT_DESCRIPTION_MAX_LENGTH}
            placeholder={t('projects.create.description_label')}
            numberOfLines={3}
            multiline={true}
            autoComplete="off"
            textInputLabel={t('projects.create.description_label')}
          />
          {userRole === 'MANAGER' && (
            <Box position="absolute" bottom={0} right={0}>
              <Button
                onPress={handleSubmit}
                isDisabled={isSubmitting || !isValid}
                shadow={5}
                size="lg"
                display="flex"
                _text={{textTransform: 'uppercase'}}>
                {t('general.save_fab')}
              </Button>
            </Box>
          )}
        </>
      )}
    </Formik>
  );
};

export default function ProjectForm({
  handleChange,
  handleBlur,
  privacy,
}: Props &
  Pick<FormikProps<ProjectFormValues>, 'handleChange' | 'handleBlur'> &
  Pick<ProjectFormValues, 'privacy'>) {
  const {t} = useTranslation();

  const inputParams = (field: keyof ProjectFormValues) => ({
    onChangeText: handleChange(field),
    onBlur: handleBlur(field),
  });

  return (
    <Column space={5}>
      <TextInput
        maxLength={PROJECT_NAME_MAX_LENGTH}
        placeholder={t('projects.create.name_label')}
        label={t('projects.create.name_label')}
        {...inputParams('name')}
      />
      <ErrorMessage fieldName="name" />

      <TextInput
        maxLength={PROJECT_DESCRIPTION_MAX_LENGTH}
        placeholder={t('projects.create.description_label')}
        label={t('projects.create.description_label')}
        numberOfLines={3}
        autoComplete="off"
        multiline={true}
        {...inputParams('description')}
      />
      <ErrorMessage fieldName="description" />
      <RadioBlock
        label={
          <Row alignItems="center">
            <Heading bold size="md">
              {t('projects.create.privacy_label')}
            </Heading>
            <HelpContentSpacer />
            <DataPrivacyInfoSheetButton />
          </Row>
        }
        options={{
          PUBLIC: {text: t('projects.create.public')},
          PRIVATE: {text: t('projects.create.private')},
        }}
        groupProps={{
          value: privacy,
          variant: 'oneLine',
          onChange: handleChange('privacy'),
          name: 'data-privacy',
        }}
      />
      <ErrorMessage fieldName="privacy" />
    </Column>
  );
}
