/*
 * Copyright © 2025 Technology Matters
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

import {cloneDeep, merge} from 'lodash/fp';
import {v4 as uuidv4} from 'uuid';

import {
  initialState as accountInitialState,
  User,
} from 'terraso-client-shared/account/accountSlice';

import type {AppState} from 'terraso-mobile-client/store';
import {rootReducer} from 'terraso-mobile-client/store/reducers';
import {
  Project,
  ProjectMembership,
  ProjectPrivacy,
  ProjectRole,
} from 'terraso-client-shared/project/projectTypes';
import {Site} from 'terraso-client-shared/site/siteTypes';
import {SerializableSet} from 'terraso-client-shared/store/utils';

import {DEFAULT_ENABLED_SOIL_PIT_METHODS} from 'terraso-mobile-client/model/soilData/soilDataConstants';
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
} from 'terraso-mobile-client/model/soilData/soilDataSlice';

export const generateUser = () => {
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

export const generateProject = (
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

export const generateSite = (
  args?: {project: Project} | {owner: User},
): Site => {
  let project, owner;
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

export const generateMembership = (userId: string, userRole: ProjectRole) => {
  return {id: uuidv4(), userId, userRole};
};

export const createSoilData = (
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

export const createProjectSettings = (
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

export const generateSiteInterval = (
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
  ...(label !== undefined ? {label} : {label: ''}),
  ...DEFAULT_ENABLED_SOIL_PIT_METHODS.reduce(
    (x, method) => ({
      ...x,
      [methodEnabled(method)]: true,
    }),
    {},
  ),
  ...(defaults || {}),
});

export const projectToSiteInterval = (
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

export const keyBy = <T, Index extends keyof T>(
  elements: Indexable<T, Index>[],
  index: Index,
) => {
  return elements.reduce(
    (x, y) => ({...x, [y[index] as string | number]: y}),
    {},
  );
};

export function initState(
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
    {account: {...accountInitialState}},
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
      soilData: {
        soilData,
        projectSettings,
        status: 'ready',
      } as SoilState,
    },
  );
}

export const createMockAppState = (): AppState => {
  // Use rootReducer to get the initial state (same as app startup with no saved state).
  // Deep clone to ensure tests that mutate state don't affect the shared initialState objects.
  return cloneDeep(rootReducer(undefined, {type: ''}));
};
