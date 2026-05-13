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

import {useFormikContext} from 'formik';
import {TFunction} from 'i18next';
import * as yup from 'yup';

import {HelpContentSpacer} from 'terraso-mobile-client/components/content/HelpContentSpacer';
import {DataPrivacyInfoButton} from 'terraso-mobile-client/components/content/info/privacy/DataPrivacyInfoButton';
import {FormTextField} from 'terraso-mobile-client/components/form/FormTextField';
import {
  Column,
  Heading,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RadioBlock} from 'terraso-mobile-client/components/RadioBlock';
import {
  PROJECT_DESCRIPTION_MAX_LENGTH,
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

export type ProjectFormValues = {
  name: string;
  description: string;
  privacy: 'PUBLIC' | 'PRIVATE';
};

export default function ProjectForm() {
  const {t} = useTranslation();
  const {values, handleChange} = useFormikContext<ProjectFormValues>();

  return (
    <Column>
      <FormTextField<ProjectFormValues>
        name="name"
        maxLength={PROJECT_NAME_MAX_LENGTH}
        placeholder={t('projects.create.name_label')}
        label={t('projects.create.name_label')}
        showCounter
      />
      <FormTextField<ProjectFormValues>
        name="description"
        maxLength={PROJECT_DESCRIPTION_MAX_LENGTH}
        placeholder={t('projects.create.description_label')}
        label={t('projects.create.description_label')}
        numberOfLines={3}
        multiline
        showCounter
      />
      <RadioBlock
        label={
          <Row alignItems="center">
            <Heading bold size="md">
              {t('projects.create.privacy_label')}
            </Heading>
            <HelpContentSpacer />
            <DataPrivacyInfoButton />
          </Row>
        }
        options={{
          PUBLIC: {text: t('projects.create.public')},
          PRIVATE: {text: t('projects.create.private')},
        }}
        groupProps={{
          value: values.privacy,
          variant: 'oneLine',
          onChange: handleChange('privacy'),
          name: 'data-privacy',
        }}
      />
      <ErrorMessage fieldName="privacy" />
    </Column>
  );
}
