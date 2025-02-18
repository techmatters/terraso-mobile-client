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

import {
  createProjectSettings,
  createSoilData,
  generateMembership,
  generateProject,
  generateSite,
  generateSiteInterval,
  generateUser,
  initState,
  projectToSiteInterval,
} from '@testing/integration/modelUtils';
import {renderSelectorHook} from '@testing/integration/utils';
import {v4 as uuidv4} from 'uuid';

import {ProjectMembership} from 'terraso-client-shared/project/projectTypes';

import {DEPTH_INTERVAL_PRESETS} from 'terraso-mobile-client/model/soilData/soilDataConstants';
import {SoilData} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {createStore} from 'terraso-mobile-client/store';
import {
  getVisibleDepthIntervals,
  selectProjectMembershipsWithUsers,
  selectProjectsWithTransferrableSites,
  selectSitesAndUserRoles,
  selectUserRoleSite,
  useSiteSoilIntervals,
} from 'terraso-mobile-client/store/selectors';

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
  const site1 = generateSite({project: project1});
  const site2 = generateSite({project: project2});
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
      [project1.id]: {projectName: project1.name, projectId: project1.id},
      [project3.id]: {projectName: project3.name, projectId: project3.id},
    },
    sites: [
      {
        projectId: project1.id,
        projectName: project1.name,
        siteId: site1.id,
        siteName: site1.name,
      },
    ],
    unaffiliatedSites: [{siteId: site3.id, siteName: site3.name}],
  });
});

test('select user sites with project role', () => {
  const user = generateUser();
  const project1 = generateProject([generateMembership(user.id, 'MANAGER')]);
  const project2 = generateProject([
    generateMembership(user.id, 'CONTRIBUTOR'),
  ]);
  const site1 = generateSite({project: project1});
  const site2 = generateSite({project: project2});
  const site3 = generateSite();
  const site4 = generateSite({project: project2});

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
  const site = generateSite({owner: user});
  const store = createStore(initState([], [user], [site], user.id));

  const siteRole = selectUserRoleSite(store.getState(), site.id);
  expect(siteRole).toStrictEqual({kind: 'site', role: 'OWNER'});
});

test('select user role in project of site', () => {
  const user = generateUser();
  const project = generateProject([generateMembership(user.id, 'VIEWER')]);
  const site = generateSite({project});
  const store = createStore(initState([project], [user], [site], user.id));

  const siteRole = selectUserRoleSite(store.getState(), site.id);
  expect(siteRole).toStrictEqual({kind: 'project', role: 'VIEWER'});
});

test('select predefined project selector', () => {
  const user = generateUser();
  const project = generateProject([generateMembership(user.id, 'MANAGER')]);
  const site = generateSite({project});
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
    aggregatedIntervals.map(({interval: {depthInterval}}) => depthInterval),
  ).toStrictEqual(
    DEPTH_INTERVAL_PRESETS.NRCS.map(({depthInterval}) => depthInterval),
  );
});

test('select predefined project selector with custom preset', () => {
  const user = generateUser();
  const project = generateProject([generateMembership(user.id, 'MANAGER')]);
  const site = generateSite({project});
  const projectDepthIntervals = [
    {depthInterval: {start: 2, end: 3}, label: 'first'},
    {depthInterval: {start: 5, end: 6}, label: ''},
  ];
  const projectSettings = createProjectSettings(project, {
    depthIntervalPreset: 'CUSTOM',
    depthIntervals: projectDepthIntervals,
  });
  const siteDepthIntervals = [
    generateSiteInterval({start: 1, end: 2}, 'site-0'),
    generateSiteInterval({start: 4, end: 6}, 'site-1'),
    generateSiteInterval({start: 7, end: 10}, 'site-2'),
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
  const site = generateSite({project});

  const projectDepthIntervals = [
    {depthInterval: {start: 1, end: 2}, label: 'first'},
    {depthInterval: {start: 2, end: 3}, label: 'second'},
  ];
  const projectSettings = createProjectSettings(project, {
    depthIntervalPreset: 'CUSTOM',
    depthIntervals: projectDepthIntervals,
  });
  const siteDepthIntervals = [
    generateSiteInterval({start: 1, end: 2}, 'label', {
      // carbonatesEnabled: true,
    }),
    generateSiteInterval({start: 2, end: 3}, 'label', {
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
      interval: {...siteDepthIntervals[1], label: 'second'},
    },
  ]);
});

// TODO-cknipe: Move utils from top of file to their own file?

describe('getVisibleDepthIntervals', () => {
  test('should return custom project intervals', () => {
    const project = generateProject();
    const site = generateSite({project: project});

    const projectDepthIntervals = [
      {depthInterval: {start: 1, end: 2}, label: 'first'},
      {depthInterval: {start: 5, end: 6}, label: 'second'},
    ];

    const projectSettings = createProjectSettings(project, {
      depthIntervals: projectDepthIntervals,
      depthIntervalPreset: 'CUSTOM',
    });

    const siteSoilData = {
      depthIntervals: [],
      depthDependentData: [],
      depthIntervalPreset: 'CUSTOM',
    } as SoilData;

    const result = getVisibleDepthIntervals(
      site.id,
      {[site.id]: site},
      {[site.id]: siteSoilData},
      projectSettings,
    );

    expect(result).toHaveLength(2);
    expect(result[0].interval.depthInterval.start).toEqual(1);
    expect(result[0].interval.depthInterval.end).toEqual(2);
    expect(result[1].interval.depthInterval.start).toEqual(5);
    expect(result[1].interval.depthInterval.end).toEqual(6);
  });

  test('should return preset project intervals', () => {
    const project = generateProject();
    const site = generateSite({project: project});

    const projectSettings = createProjectSettings(project, {
      depthIntervals: [],
      depthIntervalPreset: 'NRCS',
    });

    const siteSoilData = {
      depthIntervals: [],
      depthDependentData: [],
      // FYI sites in projects may have an inaccurate preset
      depthIntervalPreset: 'CUSTOM',
    } as SoilData;

    const result = getVisibleDepthIntervals(
      site.id,
      {[site.id]: site},
      {[site.id]: siteSoilData},
      projectSettings,
    );

    expect(result).toHaveLength(6);
    expect(result[0].interval.depthInterval.start).toEqual(0);
    expect(result[0].interval.depthInterval.end).toEqual(5);
    expect(result[1].interval.depthInterval.start).toEqual(5);
    expect(result[1].interval.depthInterval.end).toEqual(15);
  });

  test('should return project + additional site intervals', () => {
    const project = generateProject();
    const site = generateSite({project: project});
    const projectDepthIntervals = [
      {depthInterval: {start: 1, end: 2}, label: 'first'},
    ];
    const projectSettings = createProjectSettings(project, {
      depthIntervals: projectDepthIntervals,
      depthIntervalPreset: 'CUSTOM',
    });

    const siteDepthIntervals = [{depthInterval: {start: 3, end: 4}, label: ''}];

    const siteSoilData = {
      depthIntervals: siteDepthIntervals,
      depthDependentData: [],
      // FYI sites in projects may have an inaccurate preset
      depthIntervalPreset: 'NRCS',
    } as SoilData;

    const result = getVisibleDepthIntervals(
      site.id,
      {[site.id]: site},
      {[site.id]: siteSoilData},
      projectSettings,
    );

    expect(result).toHaveLength(2);
    expect(result[0].interval.depthInterval.start).toEqual(1);
    expect(result[0].interval.depthInterval.end).toEqual(2);
    expect(result[1].interval.depthInterval.start).toEqual(3);
    expect(result[1].interval.depthInterval.end).toEqual(4);
  });

  test('should return preset site intervals', () => {
    const site = generateSite();

    const siteSoilData = {
      depthIntervals: [],
      depthDependentData: [],
      depthIntervalPreset: 'NRCS',
    } as SoilData;

    const result = getVisibleDepthIntervals(
      site.id,
      {[site.id]: site},
      {[site.id]: siteSoilData},
      {},
    );

    expect(result).toHaveLength(6);
    expect(result[0].interval.depthInterval.start).toEqual(0);
    expect(result[0].interval.depthInterval.end).toEqual(5);
    expect(result[1].interval.depthInterval.start).toEqual(5);
    expect(result[1].interval.depthInterval.end).toEqual(15);
  });

  test('should return custom site intervals', () => {
    const site = generateSite();
    const siteDepthIntervals = [
      {depthInterval: {start: 1, end: 2}, label: 'first'},
      {depthInterval: {start: 3, end: 4}, label: 'second'},
    ];

    const siteSoilData = {
      depthIntervals: siteDepthIntervals,
      depthDependentData: [],
      depthIntervalPreset: 'CUSTOM',
    } as SoilData;

    const result = getVisibleDepthIntervals(
      site.id,
      {[site.id]: site},
      {[site.id]: siteSoilData},
      {},
    );

    expect(result).toHaveLength(2);
    expect(result[0].interval.depthInterval.start).toEqual(1);
    expect(result[0].interval.depthInterval.end).toEqual(2);
    expect(result[1].interval.depthInterval.start).toEqual(3);
    expect(result[1].interval.depthInterval.end).toEqual(4);
  });
});
