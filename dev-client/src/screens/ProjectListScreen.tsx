import {ScreenRoutes, TopLevelScreenProps} from './constants';
import ProjectListView from '../components/projects/ProjectListView';
import {VStack} from 'native-base';
import BottomNavigation from '../components/common/BottomNavigation';
import {useEffect} from 'react';
import {fetchProjectsForUser} from 'terraso-client-shared/project/projectSlice';
import {useDispatch, useSelector} from '../model/store';

type Props = TopLevelScreenProps<ScreenRoutes.PROJECT_LIST>;

export default function ProjectListScreen({route}: Props) {
  const dispatch = useDispatch();
  const projects = useSelector(state => state.project.projects);
  useEffect(() => {
    dispatch(fetchProjectsForUser());
  }, []);
  return (
    <VStack height="100%">
      <ProjectListView projects={Object.values(projects)} />
      <BottomNavigation />
    </VStack>
  );
}
