import {Box, Fab, ScrollView} from 'native-base';
import Form, {
  ProjectFormValues,
  projectValidationSchema,
} from 'terraso-mobile-client/components/projects/CreateProjectView/Form';
import {addProject} from 'terraso-client-shared/project/projectSlice';
import {useDispatch} from 'terraso-mobile-client/model/store';
import {useNavigation} from 'terraso-mobile-client/screens/AppScaffold';
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
