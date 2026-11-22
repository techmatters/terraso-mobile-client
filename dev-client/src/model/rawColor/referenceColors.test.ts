/*
 * Copyright © 2026 Technology Matters
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
  analyzeRoiAssignments,
  findReference,
  ReferenceColor,
  referenceMeasurements,
  RoiAssignment,
  SOIL_ROI_ID,
  soilMeasurement,
} from 'terraso-mobile-client/model/rawColor/referenceColors';
import {
  Roi,
  RoiColorAnalyzer,
  RoiReduced,
} from 'terraso-mobile-client/model/rawColor/types';

// Fake backend keyed on ROI.x so each assignment gets a predictable colour.
class FakeAnalyzer implements RoiColorAnalyzer {
  passes = 0;
  async analyzeRois(rois: Roi[]): Promise<RoiReduced[]> {
    this.passes += 1;
    return rois.map(roi => {
      const v = roi.x / 100;
      return {mean: {r: v, g: v, b: v}, dominant: {r: v, g: v, b: v}};
    });
  }
}

const assign = (id: string, x: number): RoiAssignment => ({
  id,
  roi: {x, y: 0, w: 10, h: 10},
});

describe('analyzeRoiAssignments', () => {
  test('measures every assignment in one decode pass, ids/order preserved', async () => {
    const analyzer = new FakeAnalyzer();
    const assignments = [
      assign('ref-a', 10),
      assign('ref-b', 20),
      assign(SOIL_ROI_ID, 30),
    ];

    const result = await analyzeRoiAssignments(analyzer, assignments, 'mean');

    expect(analyzer.passes).toBe(1);
    expect(result.map(m => m.id)).toEqual(['ref-a', 'ref-b', SOIL_ROI_ID]);
    expect(result[0].measured).toEqual({r: 0.1, g: 0.1, b: 0.1});
    expect(result[2].measured).toEqual({r: 0.3, g: 0.3, b: 0.3});
  });

  test('scales to N references plus soil', async () => {
    const analyzer = new FakeAnalyzer();
    const assignments = [
      assign('ref-a', 10),
      assign('ref-b', 20),
      assign('ref-c', 40),
      assign(SOIL_ROI_ID, 50),
    ];
    const result = await analyzeRoiAssignments(
      analyzer,
      assignments,
      'dominant',
    );
    expect(result).toHaveLength(4);
    expect(referenceMeasurements(result).map(m => m.id)).toEqual([
      'ref-a',
      'ref-b',
      'ref-c',
    ]);
    expect(soilMeasurement(result)?.measured).toEqual({r: 0.5, g: 0.5, b: 0.5});
  });

  test('soil/reference partition handles a soil-less set', async () => {
    const analyzer = new FakeAnalyzer();
    const result = await analyzeRoiAssignments(
      analyzer,
      [assign('ref-a', 10)],
      'mean',
    );
    expect(soilMeasurement(result)).toBeUndefined();
    expect(referenceMeasurements(result)).toHaveLength(1);
  });
});

describe('findReference', () => {
  const refs: ReferenceColor[] = [
    {id: 'yellow', label: 'Yellow', expected: {r: 1, g: 1, b: 0}},
  ];
  test('finds by id', () => {
    expect(findReference('yellow', refs)?.label).toBe('Yellow');
  });
  test('returns undefined for unknown id', () => {
    expect(findReference('nope', refs)).toBeUndefined();
  });
});
