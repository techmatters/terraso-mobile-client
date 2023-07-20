import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList, ScreenRoutes} from './constants';
import CreateProjectView from '../components/projects/CreateProjectView';

type Props = NativeStackScreenProps<
  RootStackParamList,
  ScreenRoutes.CREATE_PROJECT
>;

export default function CreateProjectScreen({}: Props) {
  return <CreateProjectView />;
}
