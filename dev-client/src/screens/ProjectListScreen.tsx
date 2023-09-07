import ProjectListView from '../components/projects/ProjectListView';
import {useEffect} from 'react';
import {fetchProjectsForUser} from 'terraso-client-shared/project/projectSlice';
import {useDispatch, useSelector} from '../model/store';
import {AppBar, AppBarIconButton, ScreenScaffold} from './ScreenScaffold';

export const ProjectListScreen = () => {
  const dispatch = useDispatch();
  const projects = useSelector(state => state.project.projects);
  useEffect(() => {
    dispatch(fetchProjectsForUser());
  }, [dispatch]);
  return (
    <ScreenScaffold
      AppBar={
        <AppBar
          LeftButton={<AppBarIconButton name="menu" />}
          RightButton={<AppBarIconButton name="help" />}
        />
      }>
      <ProjectListView
        projects={Object.values(projects).filter(({archived}) => !archived)}
      />
    </ScreenScaffold>
  );
};
