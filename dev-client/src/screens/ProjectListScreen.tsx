import {RootStackParamList, ScreenRoutes} from './constants';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import ProjectListView from '../components/projects/ProjectListView';
import {VStack} from 'native-base';
import BottomNavigation from '../components/common/BottomNavigation';
import React from 'react';

type Props = NativeStackScreenProps<
  RootStackParamList,
  ScreenRoutes.PROJECT_LIST
>;

export default function ProjectListScreen({route}: Props) {
  return (
    <VStack height="100%">
      <ProjectListView projects={route.params.projects} />
      <BottomNavigation />
    </VStack>
  );
}
