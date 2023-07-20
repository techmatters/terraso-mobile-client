import ProjectsEmptyView from './ProjectsEmptyView';
import ProjectsSearchView from './ProjectsSearchView';
import {fetchProjects} from '../../dataflow';

const projects = fetchProjects();

export const ProjectListView = () => {
  if (projects.length === 0) {
    return <ProjectsEmptyView />;
  } else {
    return <ProjectsSearchView projects={projects} />;
  }
};
