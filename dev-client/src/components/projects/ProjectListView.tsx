import {ProjectPreview} from '../../types';
import ProjectsEmptyView from './ProjectsEmptyView';
import React from 'react';
import ProjectsSearchView from './ProjectsSearchView';

type Props = {
  projects: ProjectPreview[];
};

export default function ProjectListView({projects}: Props) {
  if (projects.length === 0) {
    return <ProjectsEmptyView />;
  } else {
    return <ProjectsSearchView projects={projects} />;
  }
}
