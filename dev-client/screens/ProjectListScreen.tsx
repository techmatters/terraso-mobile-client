import {RootStackParamList, ScreenRoutes} from './constants';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import ProjectListView from '../components/projects/ProjectListView';
import {VStack} from 'native-base';
import BottomNavigation from '../components/common/BottomNavigation';
import React from 'react';
import {useTranslation} from 'react-i18next';

type Props = NativeStackScreenProps<
  RootStackParamList,
  ScreenRoutes.PROJECT_LIST
>;

export default function ProjectListScreen({route, navigation}: Props) {
  const {t} = useTranslation();

  return (
    <VStack height="100%">
      <ProjectListView projects={route.params.projects} />
      <BottomNavigation />
    </VStack>
  );
}
