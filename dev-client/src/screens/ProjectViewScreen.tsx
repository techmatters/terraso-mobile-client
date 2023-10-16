import ProjectTabs from '../components/projects/ProjectTabs';
import {AppBar, ScreenScaffold} from './ScreenScaffold';
import {useSelector} from '../model/store';

type Props = {projectId: string};

export const ProjectViewScreen = ({projectId}: Props) => {
  const project = useSelector(state => state.project.projects[projectId]);

  return (
    <ScreenScaffold AppBar={<AppBar LeftButton={null} title={project?.name} />}>
      <ProjectTabs project={project} />
    </ScreenScaffold>
  );
};
