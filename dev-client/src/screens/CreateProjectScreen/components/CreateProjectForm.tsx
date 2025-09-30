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

import React, {useMemo} from 'react';
import {useTranslation} from 'react-i18next';

import {Formik, FormikProps} from 'formik';
import {KeyboardAvoidingView, ScrollView} from 'native-base';
import {usePostHog} from 'posthog-react-native';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {Box, View} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {addProject} from 'terraso-mobile-client/model/project/projectGlobalReducer';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import ProjectForm, {
  ProjectFormValues,
  projectValidationSchema,
} from 'terraso-mobile-client/screens/CreateProjectScreen/components/ProjectForm';
import {useDispatch} from 'terraso-mobile-client/store';

export const CreateProjectForm = () => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const posthog = usePostHog();

  const onSubmit = async (values: ProjectFormValues) => {
    const {payload} = await dispatch(addProject(values));
    if (payload !== undefined && 'project' in payload) {
      // Track project creation in PostHog
      posthog?.capture('project_created', {
        project_id: payload.project.id,
        project_name: values.name,
        project_privacy: values.privacy,
      });

      navigation.replace('PROJECT_VIEW', {projectId: payload.project.id});
    }
  };
  const validationSchema = useMemo(() => projectValidationSchema(t), [t]);

  return (
    <Formik
      onSubmit={onSubmit}
      validationSchema={validationSchema}
      initialValues={{
        name: '',
        description: '',
        privacy: 'PRIVATE',
      }}
      validateOnMount={true}
      initialTouched={{
        name: true,
      }}>
      {({
        isSubmitting,
        handleSubmit,
        handleChange,
        handleBlur,
        isValid,
        values,
      }) => (
        <FormContainer
          isSubmitting={isSubmitting}
          handleSubmit={handleSubmit}
          handleChange={handleChange}
          handleBlur={handleBlur}
          isValid={isValid}
          privacy={values.privacy}
        />
      )}
    </Formik>
  );
};

const FormContainer = React.memo(
  ({
    isSubmitting,
    handleSubmit,
    handleChange,
    handleBlur,
    privacy,
    isValid,
  }: Pick<
    FormikProps<ProjectFormValues>,
    'isSubmitting' | 'handleSubmit' | 'handleChange' | 'handleBlur' | 'isValid'
  > &
    Pick<ProjectFormValues, 'privacy'>) => {
    const {t} = useTranslation();

    return (
      <KeyboardAvoidingView flex={1}>
        <ScrollView bg="background.default">
          <Box pt="16px" mx="20px">
            <ProjectForm
              handleChange={handleChange}
              handleBlur={handleBlur}
              privacy={privacy}
            />
          </Box>
          <View alignItems="flex-end" margin={5}>
            <ContainedButton
              onPress={handleSubmit}
              disabled={isSubmitting || !isValid}
              size="lg"
              label={t('general.create')}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  },
);
