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

import {Box, Fab, ScrollView} from 'native-base';
import Form, {
  ProjectFormValues,
  projectValidationSchema,
} from 'terraso-mobile-client/components/projects/CreateProjectView/Form';
import {addProject} from 'terraso-client-shared/project/projectSlice';
import {useDispatch} from 'terraso-mobile-client/model/store';
import {useNavigation} from 'terraso-mobile-client/navigation/useNavigation';
import {Formik} from 'formik';
import {useTranslation} from 'react-i18next';
import {useMemo} from 'react';
import {PROJECT_DEFAULT_MEASUREMENT_UNITS} from 'terraso-mobile-client/constants';

export default function CreateProjectView() {
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
      {({isSubmitting, handleSubmit}) => {
        return (
          <>
            <ScrollView bg="background.default">
              <Box pt="20%" mx={5}>
                <Form />
              </Box>
            </ScrollView>
            <Fab
              label={t('general.save_fab')}
              onPress={() => handleSubmit()}
              disabled={isSubmitting}
              renderInPortal={false}
            />
          </>
        );
      }}
    </Formik>
  );
}
