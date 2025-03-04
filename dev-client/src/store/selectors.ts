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

import {useMemo} from 'react';
import {
  useSelector as reduxUseSelector,
  TypedUseSelectorHook,
} from 'react-redux';

import {createSelector} from '@reduxjs/toolkit';

import {User} from 'terraso-client-shared/account/accountSlice';
import {
  Project,
  ProjectMembership,
  ProjectRole,
} from 'terraso-client-shared/project/projectTypes';
import {Site} from 'terraso-client-shared/site/siteTypes';
import {
  DepthDependentSoilData,
  ProjectSoilSettings,
  SoilDataDepthInterval,
  soilPitMethods,
} from 'terraso-client-shared/soilId/soilIdTypes';
import {
  exists,
  filterValues,
  fromEntries,
  mapValues,
} from 'terraso-client-shared/utils';

import {
  DEFAULT_ENABLED_SOIL_PIT_METHODS,
  DEFAULT_PROJECT_SETTINGS,
  DEFAULT_SOIL_DATA,
  DEPTH_INTERVAL_PRESETS,
} from 'terraso-mobile-client/model/soilData/soilDataConstants';
import {
  compareInterval,
  DepthInterval,
  methodEnabled,
  methodRequired,
  overlaps,
  sameDepth,
  SoilData,
} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {type AppState} from 'terraso-mobile-client/store/index';

const useSelector = reduxUseSelector as TypedUseSelectorHook<AppState>;

const selectProjectMemberships = (state: AppState, projectId: string) =>
  state.project.projects[projectId]?.memberships ?? [];

const selectUsers = (state: AppState) => state.account.users;

export const selectProjectMembershipsWithUsers = createSelector(
  [selectProjectMemberships, selectUsers],
  (memberships, users) =>
    Object.values(memberships)
      .filter(memb => memb.userId in users)
      .map(memb => [memb, users[memb.userId]] as [ProjectMembership, User]),
);

export const selectProject = (projectId: string) => (state: AppState) =>
  state.project.projects[projectId];

export const selectProjects = (state: AppState) => state.project.projects;

export const selectSite = (siteId: string) => (state: AppState) =>
  state.site.sites[siteId];

export const selectSites = (state: AppState) => state.site.sites;

const selectUserRole = (_state: AppState, userRole: ProjectRole) => userRole;

const selectProjectsWithUserRole = createSelector(
  [selectProjects, selectUserRole],
  (projects, userRole) =>
    filterValues(projects, project =>
      exists(
        mapValues(project.memberships, membership => membership.userRole),
        userRole,
      ),
    ),
);

const createUserRoleMap = (
  projects: Record<string, Project>,
  userId?: string,
) => {
  return Object.fromEntries(
    mapValues(projects, project => {
      if (userId === undefined) {
        return {};
      }
      const membership = Object.values(project.memberships).find(
        ({userId: membUserId}) => membUserId === userId,
      );
      if (membership) {
        return [project.id, membership.userRole];
      }
    }).filter((item): item is [string, ProjectRole] => item !== undefined),
  );
};

export const selectCurrentUserID = (state: AppState) =>
  state.account.currentUser?.data?.id;

export const selectProjectUserRolesMap = createSelector(
  [selectCurrentUserID, selectProjects],
  (currentUserID, projects) => createUserRoleMap(projects, currentUserID),
);

export const selectSitesAndUserRoles = createSelector(
  [selectCurrentUserID, selectProjects, selectSites],
  (userID, projects, sites) => {
    const userRoleMap = createUserRoleMap(projects, userID);
    return Object.fromEntries(
      mapValues(sites, site => {
        let role;
        if (site.projectId !== undefined) {
          role = userRoleMap[site.projectId];
        }
        return [site.id, role];
      }),
    );
  },
);

export const selectProjectsWithTransferrableSites = createSelector(
  [selectProjectsWithUserRole, selectSites, selectSitesAndUserRoles],
  (projects, sites, sitesWithRoles) => {
    const projectSites = projects.flatMap(project =>
      Object.keys(project.sites)
        .filter(
          siteId =>
            siteId in project.sites && sitesWithRoles[siteId] === 'MANAGER',
        )
        .map(siteId => {
          const joinedSite = sites[siteId];

          return {
            projectId: project.id,
            projectName: project.name,
            siteId: joinedSite.id,
            siteName: joinedSite.name,
          };
        }),
    );

    const unaffiliatedSites = Object.values(sites)
      .filter(({projectId}) => projectId === undefined)
      .map(({id, name}) => ({siteId: id, siteName: name}));
    const projectRecord = projects.reduce(
      (x, {id, name}) => ({
        ...x,
        [id]: {projectId: id, projectName: name},
      }),
      {} as Record<string, {projectId: string; projectName: string}>,
    );
    return {projects: projectRecord, sites: projectSites, unaffiliatedSites};
  },
);

// Note on "site" kind: In the future, there will also be site level roles, like manager and viewer
// For now we only care if a user owns a site or not.
export type SiteUserRole =
  | {kind: 'site'; role: 'OWNER'}
  | {kind: 'project'; role: ProjectRole};

const selectSiteId = (_state: any, siteId: string) => siteId;

export const selectUserRoleSite = createSelector(
  [selectSites, selectProjects, selectSiteId, selectCurrentUserID],
  (sites, projects, siteId, userId): SiteUserRole | null => {
    const site = sites[siteId];
    if (!site) {
      return null;
    }
    if (site.ownerId === userId) {
      return {kind: 'site', role: 'OWNER'};
    }
    if (site.projectId === undefined) {
      return null;
    }
    const project = projects[site.projectId];
    const membership = Object.values(project.memberships).find(
      ({userId: projectUserId}) => userId === projectUserId,
    );
    if (membership === undefined) {
      return null;
    }
    return {kind: 'project', role: membership.userRole};
  },
);

const selectProjectId = (_state: AppState, projectId: string) => projectId;

export const selectUserRoleProject = createSelector(
  [selectProjects, selectCurrentUserID, selectProjectId],
  (projects, userId, projectId) => {
    const project = projects[projectId];
    if (project === undefined) {
      return null;
    }
    const membership = Object.values(project.memberships).find(
      ({userId: projectUserId}) => userId === projectUserId,
    );
    if (membership === undefined) {
      return null;
    }
    return membership.userRole;
  },
);

const projectIntervals = (settings: ProjectSoilSettings) => {
  switch (settings.depthIntervalPreset) {
    case 'NRCS':
    case 'BLM':
      return DEPTH_INTERVAL_PRESETS[settings.depthIntervalPreset];
    case 'CUSTOM':
      return settings.depthIntervals;
    case 'NONE':
      return [];
  }
};

const sitePresetIntervals = (soilData: SoilData) => {
  switch (soilData.depthIntervalPreset) {
    case 'NRCS':
    case 'BLM':
      return DEPTH_INTERVAL_PRESETS[soilData.depthIntervalPreset];
    default:
      return [];
  }
};

/*
 * The non-hook version of useProjectSoilSettingsBase
 * FYI returns a new object every time
 */
export const getProjectSoilSettingsBase = (
  projectSettings: ProjectSoilSettings | undefined,
) => {
  const effectiveProjectSettings = projectSettings ?? DEFAULT_PROJECT_SETTINGS;
  return {
    ...effectiveProjectSettings,
    depthIntervals: projectIntervals(effectiveProjectSettings),
  };
};

const useProjectSoilSettingsBase = <ID extends string | undefined>(
  projectId: ID,
): ID extends undefined ? undefined : ProjectSoilSettings => {
  const projectSettings = useSelector(state => {
    if (projectId === undefined) {
      return undefined;
    }

    return (
      state.soilData.projectSettings[projectId] ?? DEFAULT_PROJECT_SETTINGS
    );
  });

  return useMemo(
    () =>
      projectSettings
        ? {
            ...projectSettings,
            depthIntervals: projectIntervals(projectSettings),
          }
        : undefined,
    [projectSettings],
  ) as ID extends undefined ? undefined : ProjectSoilSettings;
};

export const useProjectSoilSettings = (projectId: string) =>
  useProjectSoilSettingsBase(projectId);

export const useSiteProjectSoilSettings = (siteId: string) =>
  useProjectSoilSettingsBase(useSelector(selectSite(siteId))?.projectId);

export type AggregatedInterval = {
  isFromPreset: boolean;
  interval: SoilDataDepthInterval;
};

/* "Visible" soil data only includes depth-dependent data for which there is a
 * visible depth interval. Visible depth intervals may be custom depths that
 * exist explicitly in soilData.depthIntervals, or may be depths implicit
 * from a depth preset, or from a project's depth intervals (which are not
 * copied to the site's depthIntervals as of 2025-02)
 */
export const getVisibleSoilDataForSite = (
  siteId: string,
  allSites: Record<string, Site | undefined>,
  allSoilData: Record<string, SoilData | undefined>,
  allProjectSettings: Record<string, ProjectSoilSettings | undefined>,
): SoilData => {
  const projectId = allSites[siteId]?.projectId;
  const effectiveProjectSettings = projectId
    ? getProjectSoilSettingsBase(allProjectSettings[projectId])
    : undefined;
  const effectiveSoilData = getSoilDataForSite(siteId, allSoilData);
  const visibleDepthIntervals = getVisibleDepthIntervalsAfterNormalizing(
    effectiveProjectSettings,
    effectiveSoilData,
  );

  const depthDependentData = effectiveSoilData.depthDependentData;

  const filteredDepthData = depthDependentData.filter(depthData =>
    visibleDepthIntervals
      .map(depth => depth.interval)
      .find(sameDepth(depthData)),
  );

  return {...effectiveSoilData, depthDependentData: filteredDepthData};
};

const getSoilDataForSite = (
  siteId: string,
  soilData: Record<string, SoilData | undefined>,
) => soilData[siteId] ?? DEFAULT_SOIL_DATA;

export const selectSoilData = (siteId: string) => (state: AppState) =>
  getSoilDataForSite(siteId, state.soilData.soilData);

export const getVisibleDepthIntervals = (
  siteId: string,
  allSites: Record<string, Site | undefined>,
  allSoilData: Record<string, SoilData | undefined>,
  allProjectSettings: Record<string, ProjectSoilSettings | undefined>,
) => {
  const projectId = allSites[siteId]?.projectId;

  // Depth intervals for the site or project need to be expanded if they
  // are not custom intervals.
  const effectiveProjectSettings = projectId
    ? getProjectSoilSettingsBase(allProjectSettings[projectId])
    : undefined;
  const effectiveSoilData = getSoilDataForSite(siteId, allSoilData);

  return getVisibleDepthIntervalsAfterNormalizing(
    effectiveProjectSettings,
    effectiveSoilData,
  );
};

/*
 * In some cases, the depth intervals on the project settings and soil data may
 * not include the visible depth intervals (for example, depthIntervals can be
 * empty when there is a preset).
 * "After normalizing" here means that this function expects the input project
 * settings and soil data to already have had their depth intervals expanded in
 * these cases, which is also referred to here as "effective" settings or data.
 */
const getVisibleDepthIntervalsAfterNormalizing = (
  effectiveProjectSettings: ProjectSoilSettings | undefined,
  effectiveSoilData: SoilData,
): AggregatedInterval[] => {
  const projectOrPresetIntervals =
    effectiveProjectSettings?.depthIntervals ??
    sitePresetIntervals(effectiveSoilData);

  return [
    ...projectOrPresetIntervals.map(interval => {
      const existingInterval = effectiveSoilData.depthIntervals.find(
        sameDepth(interval),
      );
      const enabledInputs = fromEntries(
        soilPitMethods.map(method => [
          methodEnabled(method),
          effectiveProjectSettings?.[methodRequired(method)] ||
            (existingInterval?.[methodEnabled(method)] ??
              (!effectiveProjectSettings &&
                DEFAULT_ENABLED_SOIL_PIT_METHODS.includes(method))),
        ]),
      );
      return {
        isFromPreset: true,
        interval: {
          ...enabledInputs,
          ...interval,
        },
      };
    }),
    ...effectiveSoilData.depthIntervals
      .filter(interval => !projectOrPresetIntervals.some(overlaps(interval)))
      .map(interval => ({
        isFromPreset: false,
        interval: {
          ...interval,
          ...fromEntries(
            soilPitMethods.map(method => [
              methodEnabled(method),
              interval?.[methodEnabled(method)] ??
                DEFAULT_ENABLED_SOIL_PIT_METHODS.includes(method),
            ]),
          ),
        },
      })),
  ].sort(({interval: a}, {interval: b}) => compareInterval(a, b));
};

export const useSiteSoilIntervals = (siteId: string): AggregatedInterval[] => {
  const projectSettings = useSiteProjectSoilSettings(siteId);
  const soilData = useSelector(selectSoilData(siteId));

  return useMemo(
    () => getVisibleDepthIntervalsAfterNormalizing(projectSettings, soilData),
    [projectSettings, soilData],
  );
};

/*
 * This confirms that a given DepthInterval (just start & end depths) is
 * one of the site's displayed depth intervals. If so, it returns the
 * interval with its interval settings.
 */
export const useSiteSoilInterval = (
  siteId: string,
  depthInterval: DepthInterval,
): AggregatedInterval | undefined => {
  const allSiteSoilIntervals = useSiteSoilIntervals(siteId);
  const foundInterval = useMemo(
    () =>
      allSiteSoilIntervals.find(aggInterval =>
        sameDepth({depthInterval})(aggInterval.interval),
      ),
    [allSiteSoilIntervals, depthInterval],
  );
  return foundInterval;
};

export const selectDepthDependentData = ({
  siteId,
  depthInterval,
}: {
  siteId: string;
  depthInterval: {depthInterval: DepthInterval};
}): ((state: AppState) => DepthDependentSoilData) =>
  createSelector(
    selectSoilData(siteId),
    soilData =>
      soilData.depthDependentData.find(sameDepth(depthInterval)) ??
      ({
        depthInterval: depthInterval.depthInterval,
      } as DepthDependentSoilData),
  );
