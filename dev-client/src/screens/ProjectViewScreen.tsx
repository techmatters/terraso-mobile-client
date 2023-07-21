import {Box, VStack} from 'native-base';
import BottomNavigation from '../components/common/BottomNavigation';
import ProjectTabs from '../components/projects/ProjectTabs';
import {ScreenDefinition} from './AppScaffold';
import {HeaderTitle} from '@react-navigation/elements';
import {Project} from 'terraso-client-shared/project/projectSlice';

type Props = {project: Project};

const ProjectView = ({project}: Props) => {
  return (
    <VStack height="100%">
      <Box flexGrow={2} flexBasis="90%">
        <ProjectTabs project={project} />
      </Box>
      <BottomNavigation />
    </VStack>
  );
};

export const ProjectViewScreen: ScreenDefinition<Props> = {
  View: ProjectView,
  options: () => ({
    headerBackVisible: false,
    HeaderTitle: ({project, ...props}) => {
      return <HeaderTitle {...props}>{project.name}</HeaderTitle>;
    },
  }),
};
