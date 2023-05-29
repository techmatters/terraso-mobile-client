import BottomNavigation from '../BottomNavigation';
import AppBar from '../AppBar';
import {ProjectPreview} from '../../types';
import {VStack} from 'native-base';
import ProjectsEmptyView from './ProjectsEmptyView';
import React from 'react';
import ProjectsSearchView from './ProjectsSearchView';
import {useTranslation} from 'react-i18next';

type Props = {
  projects: ProjectPreview[];
};

export default function ProjectListView({projects}: Props) {
  const {t} = useTranslation();

  return (
    <VStack display="flex" maxHeight="68.5%">
      <AppBar title={t('projects.title')} />
      {projects.length == 0 ? (
        <ProjectsEmptyView />
      ) : (
        <ProjectsSearchView projects={projects} />
      )}
      <BottomNavigation />
    </VStack>
  );
}
