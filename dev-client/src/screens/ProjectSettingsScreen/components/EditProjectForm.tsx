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

import {useCallback} from 'react';
import {useTranslation} from 'react-i18next';

import {Formik, FormikHelpers} from 'formik';
import {TFunction} from 'i18next';

import {
  ProjectMembershipProjectRoleChoices,
  ProjectUpdateMutationInput,
} from 'terraso-client-shared/graphqlSchema/graphql';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {FormTextField} from 'terraso-mobile-client/components/form/FormTextField';
import {View} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {
  PROJECT_DESCRIPTION_MAX_LENGTH,
  PROJECT_NAME_MAX_LENGTH,
} from 'terraso-mobile-client/constants';
import {projectValidationSchema} from 'terraso-mobile-client/screens/CreateProjectScreen/components/ProjectForm';

export const editProjectValidationSchema = (t: TFunction) => {
  const fullSchema = projectValidationSchema(t);
  return fullSchema.pick(['name', 'description']);
};

export type ProjectFormValues = {
  name: string;
  description: string;
  privacy: 'PUBLIC' | 'PRIVATE';
};

type FormValues = Omit<ProjectUpdateMutationInput, 'id'>;

type FormProps = FormValues & {
  onSubmit: (values: FormValues) => Promise<void>;
  userRole: ProjectMembershipProjectRoleChoices | null;
};

export const EditProjectForm = ({
  onSubmit,
  name,
  description,
  userRole,
}: Omit<FormProps, 'privacy'>) => {
  const {t} = useTranslation();

  /* We reset the form after a successful submit to clear the dirty flag */
  const onSubmitAndReset = useCallback(
    (values: FormValues, helpers: FormikHelpers<FormValues>) => {
      onSubmit(values).then(() => {
        helpers.resetForm({values});
      });
    },
    [onSubmit],
  );

  return (
    <Formik<FormValues>
      validationSchema={editProjectValidationSchema(t)}
      initialValues={{name, description}}
      validateOnMount={true}
      onSubmit={onSubmitAndReset}>
      {({handleSubmit, isValid, isSubmitting, dirty}) => (
        <>
          <FormTextField<FormValues>
            name="name"
            maxLength={PROJECT_NAME_MAX_LENGTH}
            placeholder={t('projects.create.name_label')}
            label={t('projects.create.name_label')}
            showCounter
          />
          <FormTextField<FormValues>
            name="description"
            maxLength={PROJECT_DESCRIPTION_MAX_LENGTH}
            placeholder={t('projects.create.description_label')}
            label={t('projects.create.description_label')}
            multiline
            showCounter
          />
          {userRole === 'MANAGER' && (
            <View flexDirection="row" justifyContent="flex-end">
              <ContainedButton
                size="lg"
                onPress={handleSubmit}
                disabled={!dirty || isSubmitting || !isValid}
                label={t('general.save')}
              />
            </View>
          )}
        </>
      )}
    </Formik>
  );
};
