import {RootStackParamList, ScreenRoutes} from './constants';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import ProjectListView from '../components/ProjectListView';

type Props = NativeStackScreenProps<
  RootStackParamList,
  ScreenRoutes.PROJECT_LIST
>;

export default function ProjectListScreen({route, navigation}: Props) {
  return <ProjectListView />;
}
