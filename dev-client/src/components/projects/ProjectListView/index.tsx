import {Project} from 'terraso-client-shared/project/projectSlice';
import ProjectsEmptyView from './ProjectsEmptyView';
import ProjectsSearchView from './ProjectsSearchView';

type Props = {
  projects: Project[];
};

export default function ProjectListView({projects}: Props) {
  if (projects.length === 0) {
    return <ProjectsEmptyView />;
  } else {
    return <ProjectsSearchView projects={projects} />;
  }
}
