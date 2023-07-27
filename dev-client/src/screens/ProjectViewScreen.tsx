import ProjectTabs from '../components/projects/ProjectTabs';
import {ScreenDefinition} from './AppScaffold';
import {HeaderTitle} from '@react-navigation/elements';
import {ScreenScaffold} from './ScreenScaffold';

type Props = {projectName: string};

const ProjectView = (_: Props) => {
  return (
    <ScreenScaffold>
      <ProjectTabs />
    </ScreenScaffold>
  );
};

export const ProjectViewScreen: ScreenDefinition<Props> = {
  View: ProjectView,
  options: ({projectName}) => ({
    headerBackVisible: false,
    headerTitle: props => {
      // const {name} = useSelector(state => state.project.projects[projectId]);
      return <HeaderTitle {...props}>{projectName}</HeaderTitle>;
    },
  }),
};
