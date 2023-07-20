import {Box, ScrollView} from 'native-base';
import Form, {FormValues} from './Form';
import {addProject} from 'terraso-client-shared/project/projectSlice';
import {useDispatch} from '../../../model/store';
import {useNavigation} from '../../../screens';

export default function CreateProjectView() {
  const dispatch = useDispatch();
  const navigate = useNavigation();
  const onSubmit = async (values: FormValues) => {
    await dispatch(addProject(values));
    navigate.goBack();
  };
  return (
    <ScrollView bg="background.default">
      <Box pt="20%">
        <Form onSubmit={onSubmit} />
      </Box>
    </ScrollView>
  );
}
