import {Box, Fab, ScrollView} from 'native-base';
import Form, {ProjectFormValues, projectValidationSchema} from './Form';
import {addProject} from 'terraso-client-shared/project/projectSlice';
import {useDispatch} from '../../../model/store';
import {useNavigation} from '../../../screens/AppScaffold';
import {Formik} from 'formik';
import {useTranslation} from 'react-i18next';
import {useMemo} from 'react';

export default function CreateProjectView() {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const onSubmit = async (values: ProjectFormValues) => {
    const {payload} = await dispatch(addProject(values));
    if (payload !== undefined && 'id' in payload) {
      navigation.replace('PROJECT_VIEW', {project: payload});
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
