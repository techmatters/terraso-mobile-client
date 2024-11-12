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

import {getDeletedDepthIntervals} from 'terraso-mobile-client/model/soilId/actions/soilDataDiff';
import {SoilData} from 'terraso-mobile-client/model/soilId/soilIdSlice';

describe('getDeletedDepthIntervals', () => {
  let curr: SoilData;
  let prev: SoilData;

  beforeEach(() => {
    curr = {
      depthIntervalPreset: 'CUSTOM',
      depthIntervals: [],
      depthDependentData: [],
    };
    prev = {
      depthIntervalPreset: 'CUSTOM',
      depthIntervals: [],
      depthDependentData: [],
    };
  });

  test('returns empty when no previous record', () => {
    curr.depthIntervals = [
      {label: '', depthInterval: {start: 1, end: 2}},
      {label: '', depthInterval: {start: 2, end: 3}},
    ];

    const deleted = getDeletedDepthIntervals(curr, undefined);
    expect(deleted).toEqual([]);
  });

  test('returns empty when no deleted records', () => {
    curr.depthIntervals = [
      {label: '', depthInterval: {start: 1, end: 2}},
      {label: '', depthInterval: {start: 2, end: 3}},
    ];
    prev.depthIntervals = [
      {label: '', depthInterval: {start: 1, end: 2}},
      {label: '', depthInterval: {start: 2, end: 3}},
    ];

    const deleted = getDeletedDepthIntervals(curr, undefined);
    expect(deleted).toEqual([]);
  });

  test('returns prev depth intervals when deleted', () => {
    prev.depthIntervals = [
      {label: '', depthInterval: {start: 1, end: 2}},
      {label: '', depthInterval: {start: 2, end: 3}},
    ];

    const deleted = getDeletedDepthIntervals(curr, prev);
    expect(deleted).toEqual([
      {start: 1, end: 2},
      {start: 2, end: 3},
    ]);
  });

  test('returns only deleted prev intervals', () => {
    curr.depthIntervals = [{label: '', depthInterval: {start: 2, end: 3}}];
    prev.depthIntervals = [
      {label: '', depthInterval: {start: 1, end: 2}},
      {label: '', depthInterval: {start: 2, end: 3}},
    ];

    const deleted = getDeletedDepthIntervals(curr, prev);
    expect(deleted).toEqual([{start: 1, end: 2}]);
  });
});
