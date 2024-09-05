/*
 * Copyright © 2024 Technology Matters
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
  methodEnabled,
  methodRequired,
} from 'terraso-mobile-client/model/soilId/soilIdFunctions';
import {
  collectionMethods,
  LabelledDepthInterval,
  ProjectSoilSettings,
  SoilData,
  SoilPitMethod,
  soilPitMethods,
} from 'terraso-client-shared/soilId/soilIdTypes';
import { fromEntries, mapEntries } from 'terraso-client-shared/utils';

export const DEPTH_INTERVAL_PRESETS = mapEntries(
  {
    NRCS: [
      { start: 0, end: 5 },
      { start: 5, end: 15 },
      { start: 15, end: 30 },
      { start: 30, end: 60 },
      { start: 60, end: 100 },
      { start: 100, end: 200 },
    ],
    BLM: [
      { start: 0, end: 1 },
      { start: 1, end: 10 },
      { start: 10, end: 20 },
      { start: 20, end: 50 },
      { start: 50, end: 70 },
    ],
  } as const,
  depthIntervals =>
    depthIntervals.map(depthInterval => ({ label: '', depthInterval })),
) satisfies Record<'NRCS' | 'BLM', readonly LabelledDepthInterval[]>;

export const DEFAULT_ENABLED_SOIL_PIT_METHODS: SoilPitMethod[] = [
  'soilTexture',
  'soilColor',
];

// export const DEFAULT_DISABLED_SOIL_PIT_METHODS: SoilPitMethod[] = [
//   'soilStructure',
// ];

export const DEFAULT_PROJECT_SOIL_INTERVAL = fromEntries(
  soilPitMethods.map(method => [methodEnabled(method), false]),
);

export const DEFAULT_SITE_SOIL_INTERVAL = fromEntries(
  soilPitMethods.map(method => [
    methodEnabled(method),
    DEFAULT_ENABLED_SOIL_PIT_METHODS.includes(method),
  ]),
);

export const DEFAULT_PROJECT_SETTINGS: ProjectSoilSettings = {
  ...fromEntries(
    collectionMethods.map(method => [methodRequired(method), false]),
  ),
  ...fromEntries(
    DEFAULT_ENABLED_SOIL_PIT_METHODS.map(method => [
      methodRequired(method),
      true,
    ]),
  ),
  soilPitRequired: true,
  depthIntervalPreset: 'NRCS',
  depthIntervals: [],
};

export const DEFAULT_SOIL_DATA: SoilData = {
  depthDependentData: [],
  depthIntervals: [],
  depthIntervalPreset: 'NRCS',
};
