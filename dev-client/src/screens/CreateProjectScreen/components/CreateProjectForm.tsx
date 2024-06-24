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
import {Button, KeyboardAvoidingView, ScrollView} from 'native-base';

import {addProject} from 'terraso-client-shared/project/projectSlice';

import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import ProjectForm, {
  ProjectFormValues,
  projectValidationSchema,
} from 'terraso-mobile-client/screens/CreateProjectScreen/components/ProjectForm';
import {useDispatch} from 'terraso-mobile-client/store';

type Props = {};
export const CreateProjectForm = ({}: Props) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const onSubmit = async (values: ProjectFormValues) => {
    const {payload} = await dispatch(addProject(values));
    if (payload !== undefined && 'project' in payload) {
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
        </ScrollView>
        <Box position="absolute" bottom={8} right={3} p={3}>
          <Button
            onPress={handleSubmit}
            isDisabled={isSubmitting || !isValid}
            shadow={5}
            size="lg"
            _text={{textTransform: 'uppercase'}}>
            {t('general.save_fab')}
          </Button>
        </Box>
      </KeyboardAvoidingView>
    );
  },
);
