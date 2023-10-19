import ProjectTabs from 'terraso-mobile-client/components/projects/ProjectTabs';
import {
  AppBar,
  ScreenScaffold,
} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useSelector} from 'terraso-mobile-client/model/store';

type Props = {projectId: string};

export const ProjectViewScreen = ({projectId}: Props) => {
  const project = useSelector(state => state.project.projects[projectId]);

  return (
    <ScreenScaffold AppBar={<AppBar LeftButton={null} title={project?.name} />}>
      <ProjectTabs project={project} />
    </ScreenScaffold>
  );
};
