import {ProjectListView} from '../components/projects/ProjectListView';
import {VStack} from 'native-base';
import BottomNavigation from '../components/common/BottomNavigation';
import type {ScreenDefinition} from './AppScaffold';

const ProjectListScaffold = () => {
  return (
    <VStack height="100%">
      <ProjectListView />
      <BottomNavigation />
    </VStack>
  );
};

export const ProjectListScreen: ScreenDefinition = {
  View: ProjectListScaffold,
  options: () => ({headerBackVisible: false}),
};
