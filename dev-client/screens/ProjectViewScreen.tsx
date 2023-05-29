import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList, ScreenRoutes} from './constants';
import {Box, Text} from 'native-base';

type Props = NativeStackScreenProps<
  RootStackParamList,
  ScreenRoutes.PROJECT_VIEW
>;

export default function ProjectViewScreen({route, navigation}: Props) {
  return (
    <Box>
      <Text>Toodle-hoo! This is project {route.params.project.meta.name}</Text>
    </Box>
  );
}
