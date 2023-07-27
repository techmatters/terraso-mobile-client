import ProjectListView from '../components/projects/ProjectListView';
import {useEffect} from 'react';
import {fetchProjectsForUser} from 'terraso-client-shared/project/projectSlice';
import {useDispatch, useSelector} from '../model/store';
import {ScreenDefinition} from './AppScaffold';
import {ScreenScaffold} from './ScreenScaffold';

const ProjectListScaffold = () => {
  const dispatch = useDispatch();
  const projects = useSelector(state => state.project.projects);
  useEffect(() => {
    dispatch(fetchProjectsForUser());
  }, [dispatch]);
  return (
    <ScreenScaffold>
      <ProjectListView projects={Object.values(projects)} />
    </ScreenScaffold>
  );
};

export const ProjectListScreen: ScreenDefinition = {
  View: ProjectListScaffold,
  options: () => ({headerBackVisible: false}),
};
