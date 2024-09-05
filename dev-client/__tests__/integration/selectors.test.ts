/*
 * Copyright © 2023-2024 Technology Matters
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see https://www.gnu.org/licenses/.
 */

import { merge } from 'lodash/fp';
import {
  initialState as accountInitialState,
  User,
} from 'terraso-client-shared/account/accountSlice';
import {
  DEFAULT_ENABLED_SOIL_PIT_METHODS,
  DEPTH_INTERVAL_PRESETS,
} from 'terraso-mobile-client/model/soilId/soilDataConstants';
import {
  Project,
  ProjectMembership,
  ProjectPrivacy,
  ProjectRole,
} from 'terraso-client-shared/project/projectTypes';
import {
  selectProjectMembershipsWithUsers,
  selectProjectsWithTransferrableSites,
  selectSitesAndUserRoles,
  selectUserRoleSite,
  useSiteSoilIntervals,
} from 'terraso-mobile-client/store/selectors';
import { Site } from 'terraso-client-shared/site/siteTypes';
import {
  DepthInterval,
  methodEnabled,
  methodRequired,
  ProjectDepthInterval,
  ProjectSoilSettings,
  SoilData,
  SoilDataDepthInterval,
  SoilPitMethod,
  soilPitMethods,
  SoilState,
} from 'terraso-mobile-client/model/soilId/soilIdSlice';
import { SerializableSet } from 'terraso-client-shared/store/utils';
import { v4 as uuidv4 } from 'uuid';
import { createStore } from 'terraso-mobile-client/store';
import { renderSelectorHook } from '@testing/integration/utils';


const generateUser = () => {
  const id = uuidv4();
  return {
    id,
    email: id + '@example.org',
    firstName: id,
    lastName: id,
    profileImage: 'user.jpg',
    preferences: {},
  };
};

const generateProject = (
  memberships: ProjectMembership[] = [],
  privacy?: ProjectPrivacy,
  sites: Site[] = [],
): Project => {
  const id = uuidv4();
  const siteSet: SerializableSet = {};
  for (let site of sites) {
    site.projectId = id;
    siteSet[site.id] = true;
  }
  return {
    id,
    name: id,
    measurementUnits: 'METRIC',
    privacy: privacy ?? 'PRIVATE',
    description: '',
    updatedAt: '2023-10-12',
    sites: siteSet,
    archived: false,
    memberships: keyBy(memberships, 'id'),
    siteInstructions: '',
  };
};

const generateSite = (args?: { project: Project } | { owner: User }): Site => {
  let project,
    owner;
  if (args && 'project' in args) {
    project = args.project;
  } else if (args) {
    owner = args.owner;
  }
  const id = uuidv4();
  const site: Site = {
    projectId: project?.id,
    ownerId: owner?.id,
    id,
    name: 'Test Site',
    latitude: 0,
    longitude: 0,
    elevation: 0,
    privacy: 'PRIVATE',
    archived: false,
    updatedAt: '2023-10-24',
    notes: {},
  };
  if (project !== undefined) {
    project.sites[site.id] = true;
  }
  return site;
};

const generateMembership = (userId: string, userRole: ProjectRole) => {
  return { id: uuidv4(), userId, userRole };
};

const createSoilData = (
  site: Site,
  defaults?: Partial<SoilData>,
): Record<string, SoilData> => {
  return {
    [site.id]: {
      depthDependentData: [],
      depthIntervals: [],
      depthIntervalPreset: 'NRCS',
      ...defaults,
    },
  };
};

const createProjectSettings = (
  project: Project,
  defaults?: Partial<ProjectSoilSettings>,
): Record<string, ProjectSoilSettings> => {
  return {
    [project.id]: {
      // carbonatesRequired: false,
      depthIntervalPreset: 'NRCS',
      depthIntervals: [],
      // electricalConductivityRequired: false,
      // landUseLandCoverRequired: false,
      notesRequired: false,
      // phRequired: false,
      // photosRequired: false,
      slopeRequired: false,
      // sodiumAdsorptionRatioRequired: false,
      soilColorRequired: false,
      // soilLimitationsRequired: false,
      // soilOrganicCarbonMatterRequired: false,
      soilPitRequired: false,
      // soilStructureRequired: false,
      soilTextureRequired: false,
      verticalCrackingRequired: false,
      ...defaults,
    },
  };
};

const generateSiteInterval = (
  interval: DepthInterval,
  label?: string,
  defaults?: Partial<SoilDataDepthInterval>,
): SoilDataDepthInterval => ({
  depthInterval: interval,
  // electricalConductivityEnabled: false,
  // phEnabled: false,
  // sodiumAdsorptionRatioEnabled: false,
  soilColorEnabled: false,
  // soilOrganicCarbonMatterEnabled: false,
  // soilStructureEnabled: false,
  soilTextureEnabled: false,
  // carbonatesEnabled: false,
  ...(label !== undefined ? { label } : { label: '' }),
  ...DEFAULT_ENABLED_SOIL_PIT_METHODS.reduce(
    (x, method) => ({
      ...x,
      [methodEnabled(method)]: true,
    }),
    {},
  ),
  ...(defaults || {}),
});

const projectToSiteInterval = (
  interval: ProjectDepthInterval,
  projectSettings?: ProjectSoilSettings,
) => {
  const siteInterval: SoilDataDepthInterval = {
    depthInterval: interval.depthInterval,
    label: interval.label,
    ...(Object.fromEntries(
      soilPitMethods.map((method: SoilPitMethod) => [
        methodEnabled(method),
        projectSettings
          ? projectSettings[methodRequired(method)]
          : false ||
            (DEFAULT_ENABLED_SOIL_PIT_METHODS as readonly string[]).includes(
              method,
            ),
      ]),
    ) as Record<`${SoilPitMethod}Enabled`, boolean>),
  };
  return siteInterval;
};

type Indexable<T, Index extends keyof T> = T[Index] extends string | number
  ? T
  : never;

const keyBy = <T, Index extends keyof T>(
  elements: Indexable<T, Index>[],
  index: Index,
) => {
  return elements.reduce(
    (x, y) => ({ ...x, [y[index] as string | number]: y }),
    {},
  );
};

function initState(
  projects: Project[],
  users: User[],
  sites: Site[] = [],
  currentUserID?: string,
  soilId?: {
    soilData?: Record<string, SoilData>;
    projectSettings?: Record<string, ProjectSoilSettings>;
  },
) {
  const soilData = soilId?.soilData || {};
  const projectSettings = soilId?.projectSettings || {};
  return merge(
    { account: { ...accountInitialState } },
    {
      account: {
        users: keyBy(users, 'id'),
        currentUser: {
          data: {
            id: currentUserID ?? users[0]?.id,
          },
        },
      },
      project: {
        projects: keyBy(projects, 'id'),
      },
      site: {
        sites: keyBy(sites, 'id'),
      },
      soilId: {
        soilData,
        projectSettings,
        status: 'ready',
      } as SoilState,
    },
  );
}

test('can select memberships', () => {
  const user = generateUser();
  const membership: ProjectMembership = {
    id: uuidv4(),
    userId: user.id,
    userRole: 'MANAGER',
  };
  const project = generateProject([membership]);
  const store = createStore(initState([project], [user]));

  const memberships = selectProjectMembershipsWithUsers(
    store.getState(),
    project.id,
  );
  expect(memberships).toStrictEqual([[membership, user]]);
});

test('can select memberships of specific project', () => {
  const user = generateUser();
  const membershipA = generateMembership(user.id, 'VIEWER');
  const membershipB = generateMembership(user.id, 'MANAGER');
  const projectA = generateProject([membershipA]);
  const projectB = generateProject([membershipB]);
  const store = createStore(initState([projectA, projectB], [user]));

  const memberships = selectProjectMembershipsWithUsers(
    store.getState(),
    projectB.id,
  );
  expect(memberships).toStrictEqual([[membershipB, user]]);
});

test('not found project returns empty membership', () => {
  const store = createStore(initState([], []));
  const memberships = selectProjectMembershipsWithUsers(
    store.getState(),
    'badid',
  );
  expect(memberships).toStrictEqual([]);
});

test('can access all projects with role', () => {
  const user = generateUser();
  const project1 = generateProject([generateMembership(user.id, 'MANAGER')]);
  const project2 = generateProject([
    generateMembership(user.id, 'CONTRIBUTOR'),
  ]);
  const project3 = generateProject([generateMembership(user.id, 'MANAGER')]);
  const site1 = generateSite({ project: project1 });
  const site2 = generateSite({ project: project2 });
  const site3 = generateSite();

  const store = createStore(
    initState(
      [project1, project2, project3],
      [user],
      [site1, site2, site3],
      user.id,
    ),
  );
  const pairs = selectProjectsWithTransferrableSites(
    store.getState(),
    'MANAGER',
  );
  expect(pairs).toStrictEqual({
    projects: {
      [project1.id]: { projectName: project1.name, projectId: project1.id },
      [project3.id]: { projectName: project3.name, projectId: project3.id },
    },
    sites: [
      {
        projectId: project1.id,
        projectName: project1.name,
        siteId: site1.id,
        siteName: site1.name,
      },
    ],
    unaffiliatedSites: [{ siteId: site3.id, siteName: site3.name }],
  });
});

test('select user sites with project role', () => {
  const user = generateUser();
  const project1 = generateProject([generateMembership(user.id, 'MANAGER')]);
  const project2 = generateProject([
    generateMembership(user.id, 'CONTRIBUTOR'),
  ]);
  const site1 = generateSite({ project: project1 });
  const site2 = generateSite({ project: project2 });
  const site3 = generateSite();
  const site4 = generateSite({ project: project2 });

  const store = createStore(
    initState(
      [project1, project2],
      [user],
      [site1, site2, site3, site4],
      user.id,
    ),
  );

  const roles = selectSitesAndUserRoles(store.getState());
  expect(roles).toStrictEqual({
    [site1.id]: 'MANAGER',
    [site2.id]: 'CONTRIBUTOR',
    [site3.id]: undefined,
    [site4.id]: 'CONTRIBUTOR',
  });
});

test('select user role when site owned', () => {
  const user = generateUser();
  const site = generateSite({ owner: user });
  const store = createStore(initState([], [user], [site], user.id));

  const siteRole = selectUserRoleSite(store.getState(), site.id);
  expect(siteRole).toStrictEqual({ kind: 'site', role: 'OWNER' });
});

test('select user role in project of site', () => {
  const user = generateUser();
  const project = generateProject([generateMembership(user.id, 'VIEWER')]);
  const site = generateSite({ project });
  const store = createStore(initState([project], [user], [site], user.id));

  const siteRole = selectUserRoleSite(store.getState(), site.id);
  expect(siteRole).toStrictEqual({ kind: 'project', role: 'VIEWER' });
});

test('select predefined project selector', () => {
  const user = generateUser();
  const project = generateProject([generateMembership(user.id, 'MANAGER')]);
  const site = generateSite({ project });
  const soilData = createSoilData(site);
  const projectSettings = createProjectSettings(project, {
    depthIntervalPreset: 'NRCS',
  });

  const aggregatedIntervals = renderSelectorHook(
    () => useSiteSoilIntervals(site.id),
    initState([project], [user], [site], user.id, {
      soilData,
      projectSettings,
    }),
  );

  expect(
    aggregatedIntervals.map(({ interval: { depthInterval } }) => depthInterval),
  ).toStrictEqual(
    DEPTH_INTERVAL_PRESETS.NRCS.map(({ depthInterval }) => depthInterval),
  );
});

test('select predefined project selector with custom preset', () => {
  const user = generateUser();
  const project = generateProject([generateMembership(user.id, 'MANAGER')]);
  const site = generateSite({ project });
  const projectDepthIntervals = [
    { depthInterval: { start: 2, end: 3 }, label: 'first' },
    { depthInterval: { start: 5, end: 6 }, label: '' },
  ];
  const projectSettings = createProjectSettings(project, {
    depthIntervalPreset: 'CUSTOM',
    depthIntervals: projectDepthIntervals,
  });
  const siteDepthIntervals = [
    generateSiteInterval({ start: 1, end: 2 }, 'site-0'),
    generateSiteInterval({ start: 4, end: 6 }, 'site-1'),
    generateSiteInterval({ start: 7, end: 10 }, 'site-2'),
  ];
  const soilData = createSoilData(site, {
    depthIntervals: siteDepthIntervals,
  });

  const aggregatedIntervals = renderSelectorHook(
    () => useSiteSoilIntervals(site.id),
    initState([project], [user], [site], user.id, {
      soilData,
      projectSettings,
    }),
  );

  expect(aggregatedIntervals).toStrictEqual([
    {
      isFromPreset: false,
      interval: siteDepthIntervals[0],
    },
    {
      isFromPreset: true,
      interval: projectToSiteInterval(
        projectDepthIntervals[0],
        projectSettings[project.id],
      ),
    },
    {
      isFromPreset: true,
      interval: projectToSiteInterval(
        projectDepthIntervals[1],
        projectSettings[project.id],
      ),
    },
    {
      isFromPreset: false,
      interval: siteDepthIntervals[2],
    },
  ]);
});

test('overlapping site intervals get the project values of the preset interval', () => {
  const user = generateUser();
  const project = generateProject([generateMembership(user.id, 'MANAGER')]);
  const site = generateSite({ project });

  const projectDepthIntervals = [
    { depthInterval: { start: 1, end: 2 }, label: 'first' },
    { depthInterval: { start: 2, end: 3 }, label: 'second' },
  ];
  const projectSettings = createProjectSettings(project, {
    depthIntervalPreset: 'CUSTOM',
    depthIntervals: projectDepthIntervals,
  });
  const siteDepthIntervals = [
    generateSiteInterval({ start: 1, end: 2 }, 'label', {
      // carbonatesEnabled: true,
    }),
    generateSiteInterval({ start: 2, end: 3 }, 'label', {
      // phEnabled: true,
    }),
  ];
  const soilData = createSoilData(site, {
    depthIntervals: siteDepthIntervals,
  });

  const aggregatedIntervals = renderSelectorHook(
    () => useSiteSoilIntervals(site.id),
    initState([project], [user], [site], user.id, {
      soilData,
      projectSettings,
    }),
  );

  expect(aggregatedIntervals).toStrictEqual([
    {
      isFromPreset: true,
      interval: {
        ...siteDepthIntervals[0],
        label: 'first',
        // carbonatesEnabled: true,
      },
    },
    {
      isFromPreset: true,
      interval: { ...siteDepthIntervals[1], label: 'second' },
    },
  ]);
});
