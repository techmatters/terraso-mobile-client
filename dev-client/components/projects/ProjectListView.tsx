import BottomNavigation from '../BottomNavigation';
import AppBar from '../AppBar';
import {ProjectDescription} from '../../types';
import {VStack} from 'native-base';
import ProjectsEmptyView from './ProjectsEmptyView';
import React from 'react';
import ProjectsSearchView from './ProjectsSearchView';

type Props = {
  projects: ProjectDescription[];
};

export default function ProjectListView({ projects }: Props) {

  return (
    <VStack display="flex" h="100%">
          <AppBar />
          {(projects.length == 0) ? <ProjectsEmptyView /> : <ProjectsSearchView projects={projects} />}
      <BottomNavigation />
    </VStack>
  );
}
