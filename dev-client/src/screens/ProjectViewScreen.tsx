import {Box, VStack} from 'native-base';
import BottomNavigation from '../components/common/BottomNavigation';
import ProjectTabs from '../components/projects/ProjectTabs';
import {ScreenDefinition} from './AppScaffold';
import {HeaderTitle} from '@react-navigation/elements';

type Props = {projectName: string};

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
    HeaderTitle: ({projectName, ...props}) => {
      return <HeaderTitle {...props}>{projectName}</HeaderTitle>;
    },
  }),
};
