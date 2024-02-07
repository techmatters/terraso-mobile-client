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

import {Button, KeyboardAvoidingView, ScrollView} from 'native-base';
import Form, {
  ProjectFormValues,
  projectValidationSchema,
} from 'terraso-mobile-client/screens/CreateProjectScreen/components/Form';
import {addProject} from 'terraso-client-shared/project/projectSlice';
import {useDispatch} from 'terraso-mobile-client/store';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {Formik, FormikProps} from 'formik';
import {useTranslation} from 'react-i18next';
import React, {useMemo} from 'react';
import {PROJECT_DEFAULT_MEASUREMENT_UNITS} from 'terraso-mobile-client/constants';
import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';

type Props = {
  onInfoPress: () => void;
};

export const CreateProjectForm = ({onInfoPress}: Props) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const onSubmit = async (values: ProjectFormValues) => {
    const {payload} = await dispatch(
      addProject({
        ...values,
        // select default measurement units for now
        // TODO: Make this customizable depending on region
        measurementUnits: PROJECT_DEFAULT_MEASUREMENT_UNITS,
      }),
    );
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
      }}>
      {({isSubmitting, handleSubmit, handleChange, handleBlur, values}) => (
        <FormContainer
          isSubmitting={isSubmitting}
          handleSubmit={handleSubmit}
          handleChange={handleChange}
          handleBlur={handleBlur}
          onInfoPress={onInfoPress}
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
    onInfoPress,
    privacy,
  }: Pick<
    FormikProps<ProjectFormValues>,
    'isSubmitting' | 'handleSubmit' | 'handleChange' | 'handleBlur'
  > &
    Props &
    Pick<ProjectFormValues, 'privacy'>) => {
    const {t} = useTranslation();

    return (
      <KeyboardAvoidingView flex={1}>
        <ScrollView bg="background.default">
          <Box pt="20%" mx={5}>
            <Form
              onInfoPress={onInfoPress}
              handleChange={handleChange}
              handleBlur={handleBlur}
              privacy={privacy}
            />
          </Box>
        </ScrollView>
        <Box position="absolute" bottom={8} right={3} p={3}>
          <Button
            onPress={handleSubmit}
            disabled={isSubmitting}
            shadow={5}
            size={'lg'}
            _text={{textTransform: 'uppercase'}}>
            {t('general.save_fab')}
          </Button>
        </Box>
      </KeyboardAvoidingView>
    );
  },
);
