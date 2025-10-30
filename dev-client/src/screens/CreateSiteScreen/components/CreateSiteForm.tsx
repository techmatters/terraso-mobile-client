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
import {Platform} from 'react-native';

import {FormikProps} from 'formik';
import {KeyboardAvoidingView, Spacer} from 'native-base';
import {InferType} from 'yup';

import {Coords} from 'terraso-client-shared/types';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {HelpButton} from 'terraso-mobile-client/components/buttons/icons/common/HelpButton';
import {HelpContentSpacer} from 'terraso-mobile-client/components/content/HelpContentSpacer';
import {DataPrivacyInfoButton} from 'terraso-mobile-client/components/content/info/privacy/DataPrivacyInfoButton';
import {FormField} from 'terraso-mobile-client/components/form/FormField';
import {FormInput} from 'terraso-mobile-client/components/form/FormInput';
import {FormLabel} from 'terraso-mobile-client/components/form/FormLabel';
import {FormRadio} from 'terraso-mobile-client/components/form/FormRadio';
import {FormRadioGroup} from 'terraso-mobile-client/components/form/FormRadioGroup';
import {
  Column,
  Text,
  View,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {ProjectSelect} from 'terraso-mobile-client/components/ProjectSelect';
import {SafeScrollView} from 'terraso-mobile-client/components/SafeScrollView';
import {SITE_NAME_MAX_LENGTH} from 'terraso-mobile-client/constants';
import {siteValidationSchema} from 'terraso-mobile-client/schemas/siteValidationSchema';
import {useSelector} from 'terraso-mobile-client/store';
import {formatCoordinate} from 'terraso-mobile-client/util';

export type FormState = InferType<ReturnType<typeof siteValidationSchema>>;

export const CreateSiteForm = ({
  isSubmitting,
  handleSubmit,
  setValues,
  values,
  isValid,
}: FormikProps<FormState> & {
  sitePin: Coords | undefined;
}) => {
  const {t} = useTranslation();
  const {accuracyM} = useSelector(state => state.map.userLocation);

  const projectPrivacy = useSelector(state =>
    values.projectId
      ? state.project.projects[values.projectId].privacy
      : undefined,
  );

  const hasProjects = useSelector(state =>
    Boolean(Object.keys(state.project.projects).length),
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      flex={1}
      keyboardVerticalOffset={40}>
      <SafeScrollView>
        <Column p="16px" pt="30px" space="18px">
          <FormField name="name">
            <FormInput
              maxLength={SITE_NAME_MAX_LENGTH}
              placeholder={t('site.create.name_label')}
              textInputLabel={t('site.create.name_label')}
            />
          </FormField>

          <FormLabel>{t('site.create.location_label')}</FormLabel>
          <Text mt="-20px">
            {t('site.create.location_accuracy', {
              accuracyM: accuracyM?.toFixed(0),
            })}
          </Text>
          <FormField name="latitude">
            <FormInput
              value={formatCoordinate(values.latitude)}
              textInputLabel={t('site.create.latitude')}
              keyboardType="numeric"
            />
          </FormField>
          <FormField name="longitude">
            <FormInput
              value={formatCoordinate(values.longitude)}
              textInputLabel={t('site.create.longitude')}
              keyboardType="numeric"
            />
          </FormField>
          {hasProjects && (
            <FormField name="projectId">
              <FormLabel>
                {t('site.create.add_to_project_label')}
                <HelpContentSpacer />
                <HelpButton>
                  {t('site.create.add_to_project_tooltip')}
                </HelpButton>
              </FormLabel>
              <ProjectSelect
                projectId={values.projectId ?? null}
                userRoles={['MANAGER', 'CONTRIBUTOR']}
                setProjectId={projectId =>
                  setValues(current => ({
                    ...current,
                    projectId: projectId ?? undefined,
                  }))
                }
              />
            </FormField>
          )}
          <FormField name="privacy">
            <FormLabel>
              {t('privacy.label')}
              <HelpContentSpacer />
              <DataPrivacyInfoButton />
            </FormLabel>
            <FormRadioGroup
              values={['PUBLIC', 'PRIVATE']}
              variant="oneLine"
              value={projectPrivacy ?? values.privacy}
              renderRadio={value => (
                <FormRadio
                  key={value}
                  value={value}
                  isDisabled={projectPrivacy !== undefined}>
                  {t(`privacy.${value.toLowerCase()}.title`)}
                </FormRadio>
              )}
            />
          </FormField>
          <Spacer />
        </Column>
        <View alignItems="flex-end" margin={5}>
          <ContainedButton
            onPress={handleSubmit}
            disabled={isSubmitting || !isValid}
            size="lg"
            label={t('general.create')}
          />
        </View>
      </SafeScrollView>
    </KeyboardAvoidingView>
  );
};
