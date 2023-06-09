import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList, ScreenRoutes} from './constants';
import {Box, Text, VStack} from 'native-base';
import React from 'react';
import BottomNavigation from '../components/common/BottomNavigation';
import ProjectTabs from '../components/projects/ProjectTabs';

type Props = NativeStackScreenProps<
  RootStackParamList,
  ScreenRoutes.PROJECT_VIEW
>;

export default function ProjectViewScreen({route, navigation}: Props) {
  return (
    <VStack height="100%">
      <Box flexGrow={2} flexBasis="90%">
        <ProjectTabs />
      </Box>
      <BottomNavigation />
    </VStack>
  );
}
