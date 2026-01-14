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

import {Site} from 'terraso-client-shared/site/siteTypes';
import {
  ProjectSoilSettings,
  SoilDataDepthInterval,
  soilPitMethods,
} from 'terraso-client-shared/soilId/soilIdTypes';
import {fromEntries} from 'terraso-client-shared/utils';

import {
  DEFAULT_ENABLED_SOIL_PIT_METHODS,
  DEFAULT_PROJECT_SETTINGS,
  DEFAULT_SOIL_DATA,
  DEPTH_INTERVAL_PRESETS,
} from 'terraso-mobile-client/model/soilData/soilDataConstants';
import {
  compareInterval,
  methodEnabled,
  methodRequired,
  overlaps,
  sameDepth,
  SoilData,
} from 'terraso-mobile-client/model/soilData/soilDataSlice';

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

export const getSoilDataForSite = (
  siteId: string | undefined,
  soilData: Record<string, SoilData | undefined>,
) =>
  siteId === undefined
    ? DEFAULT_SOIL_DATA
    : (soilData[siteId] ?? DEFAULT_SOIL_DATA);

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
export const getVisibleDepthIntervalsAfterNormalizing = (
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

export const projectIntervals = (settings: ProjectSoilSettings) => {
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

export const sitePresetIntervals = (soilData: SoilData) => {
  switch (soilData.depthIntervalPreset) {
    case 'NRCS':
    case 'BLM':
      return DEPTH_INTERVAL_PRESETS[soilData.depthIntervalPreset];
    default:
      return [];
  }
};
