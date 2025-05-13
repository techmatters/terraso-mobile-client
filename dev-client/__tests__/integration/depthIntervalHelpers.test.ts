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

import {
  createProjectSettings,
  generateProject,
  generateSite,
} from '@testing/integration/modelUtils';

import {SoilData} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {getVisibleDepthIntervals} from 'terraso-mobile-client/store/depthIntervalHelpers';

describe('getVisibleDepthIntervals', () => {
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
});
