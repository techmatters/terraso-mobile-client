import {ProjectPreview, Project} from '../types';

export function fetchProjects(): ProjectPreview[] {
  return [
    {
      id: 0,
      name: 'Project #1',
      description:
        'This is an optional project description that will have a limited length.',
      siteCount: 8,
      userCount: 4,
      lastModified: '1995-12-17T03:24:00',
      isNew: true,
      percentComplete: 60,
    },
    {
      id: 1,
      name: 'A really long project name that should not be shortened despite the fact that it is too long to be feasible.',
      description:
        'The optional project description should be limited on the backend. We can limit it if it is too long to be displayed properly.',
      siteCount: 10,
      userCount: 5,
      lastModified: '2010-05-01T01:25:23',
      isNew: false,
      percentComplete: 60,
    },
  ];
}

const projectSiteMap = new Map([
  [
    1,
    [
      {
        id: 1,
        name: 'site1',
        lastModified: {
          date: '2010-05-01T01:25:23',
          user: {name: 'alice', id: 1},
        },
        percentComplete: 60,
      },
      {
        id: 2,
        name: 'site2',
        lastModified: {
          date: '2010-05-01T01:25:23',
          user: {name: 'alice', id: 1},
        },
        percentComplete: 60,
      },
      {
        id: 3,
        name: 'site3',
        lastModified: {
          date: '2010-05-01T01:25:23',
          user: {name: 'alice', id: 1},
        },
        percentComplete: 60,
      },
      {
        id: 4,
        name: 'site4',
        lastModified: {
          date: '2010-05-01T01:25:23',
          user: {name: 'alice', id: 1},
        },
        percentComplete: 60,
      },
      {
        id: 5,
        name: 'site5',
        lastModified: {
          date: '2010-05-01T01:25:23',
          user: {name: 'alice', id: 1},
        },
        percentComplete: 60,
      },
    ],
  ],
  [
    2,
    [
      {
        id: 6,
        name: 'site6',
        lastModified: {
          date: '2010-05-01T01:25:23',
          user: {name: 'alice', id: 1},
        },
        percentComplete: 60,
      },
      {
        id: 7,
        name: 'site7',
        lastModified: {
          date: '2010-05-01T01:25:23',
          user: {name: 'alice', id: 1},
        },
        percentComplete: 60,
      },
      {
        id: 8,
        name: 'site8',
        lastModified: {
          date: '2010-05-01T01:25:23',
          user: {name: 'alice', id: 1},
        },
        percentComplete: 60,
      },
      {
        id: 9,
        name: 'site9',
        lastModified: {
          date: '2010-05-01T01:25:23',
          user: {name: 'alice', id: 1},
        },
        percentComplete: 60,
      },
      {
        id: 10,
        name: 'site10',
        lastModified: {
          date: '2010-05-01T01:25:23',
          user: {name: 'alice', id: 1},
        },
        percentComplete: 60,
      },
    ],
  ],
]);

export function fetchProject(projectId: number): Project {
  return {
    meta: fetchProjects()[projectId],
    sites: projectSiteMap.get(projectId) || [],
    inputs: {
      units: 'metric',
      source: 'survey',
    },
    memberPermissions: 'view',
    users: [{name: 'alice', id: 1}],
  };
}
