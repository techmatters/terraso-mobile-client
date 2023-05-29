import {ProjectDescription} from '../types';

export function fetchProjects(): ProjectDescription[] {
  return [
    {
      id: 1,
      name: 'Project #1',
      description:
        'This is an optional project description that will have a limited length.',
      siteCount: 8,
      userCount: 4,
      lastModified: '1995-12-17T03:24:00',
      isNew: true,
    },
    {
      id: 2,
      name: 'A really long project name that should not be shortened despite the fact that it is too long to be feasible.',
      description:
        'The optional project description should be limited on the backend. We can limit it if it is too long to be displayed properly.',
      siteCount: 10,
      userCount: 5,
      lastModified: '2010-05-01T01:25:23',
      isNew: false,
    },
  ];
}
