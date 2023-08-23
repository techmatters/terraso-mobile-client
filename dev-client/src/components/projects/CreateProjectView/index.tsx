import {Box, ScrollView} from 'native-base';
import Form, {FormValues} from './Form';
import {addProject} from 'terraso-client-shared/project/projectSlice';
import {useDispatch} from '../../../model/store';
import {useNavigation} from '../../../screens/AppScaffold';

export default function CreateProjectView() {
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const onSubmit = async (values: FormValues) => {
    const {payload} = await dispatch(addProject(values));
    if (payload !== undefined && 'id' in payload) {
      navigation.replace('PROJECT_VIEW', {project: payload});
    }
  };
  return (
    <ScrollView bg="background.default">
      <Box pt="20%" mx={5}>
        <Form onSubmit={onSubmit} />
      </Box>
    </ScrollView>
  );
}
