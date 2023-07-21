import {Box, VStack} from 'native-base';
import BottomNavigation from '../components/common/BottomNavigation';
import ProjectTabs from '../components/projects/ProjectTabs';
import {ScreenDefinition} from './AppScaffold';
import {HeaderTitle} from '@react-navigation/elements';

type Props = {projectId: number};

const ProjectView = (_: Props) => {
  return (
    <VStack height="100%">
      <Box flexGrow={2} flexBasis="90%">
        <ProjectTabs />
      </Box>
      <BottomNavigation />
    </VStack>
  );
};

export const ProjectViewScreen: ScreenDefinition<Props> = {
  View: ProjectView,
  options: () => ({
    headerBackVisible: false,
    HeaderTitle: ({projectId, ...props}) => {
      // const {name} = useSelector(state => state.project.projects[projectId]);
      return <HeaderTitle {...props}>{'Project #' + projectId}</HeaderTitle>;
    },
  }),
};
