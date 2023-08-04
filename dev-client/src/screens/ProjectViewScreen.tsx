import ProjectTabs from '../components/projects/ProjectTabs';
import {ScreenDefinition} from './AppScaffold';
import {HeaderTitle} from '@react-navigation/elements';
import {Project} from 'terraso-client-shared/project/projectSlice';
import {ScreenScaffold} from './ScreenScaffold';

type Props = {project: Project};

const ProjectView = ({project}: Props) => {
  return (
    <ScreenScaffold>
      <ProjectTabs project={project} />
    </ScreenScaffold>
  );
};

export const ProjectViewScreen: ScreenDefinition<Props> = {
  View: ProjectView,
  options: ({project: {name}}) => ({
    headerBackVisible: false,
    headerTitle: props => {
      // const {name} = useSelector(state => state.project.projects[projectId]);
      return <HeaderTitle {...props}>{name}</HeaderTitle>;
    },
  }),
};
