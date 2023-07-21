import ProjectListView from '../components/projects/ProjectListView';
import {VStack} from 'native-base';
import BottomNavigation from '../components/common/BottomNavigation';
import {useEffect} from 'react';
import {fetchProjectsForUser} from 'terraso-client-shared/project/projectSlice';
import {useDispatch, useSelector} from '../model/store';
import {ScreenDefinition} from './AppScaffold';

const ProjectListScaffold = () => {
  const dispatch = useDispatch();
  const projects = useSelector(state => state.project.projects);
  useEffect(() => {
    dispatch(fetchProjectsForUser());
  }, [dispatch]);
  return (
    <VStack height="100%">
      <ProjectListView projects={Object.values(projects)} />
      <BottomNavigation />
    </VStack>
  );
};

export const ProjectListScreen: ScreenDefinition = {
  View: ProjectListScaffold,
  options: () => ({headerBackVisible: false}),
};
