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
  getColorFromRoi,
  getColorsFromRois,
  selectColor,
} from 'terraso-mobile-client/model/rawColor/colorReducer';
import {
  Roi,
  RoiColorAnalyzer,
  RoiReduced,
} from 'terraso-mobile-client/model/rawColor/types';

const reduced = (m: number, d: number): RoiReduced => ({
  mean: {r: m, g: m, b: m},
  dominant: {r: d, g: d, b: d},
});

// Fake backend: returns a distinct mean/dominant per ROI so we can assert
// ordering and that the right reduction is picked.
class FakeAnalyzer implements RoiColorAnalyzer {
  calls: Roi[][] = [];
  async analyzeRois(rois: Roi[]): Promise<RoiReduced[]> {
    this.calls.push(rois);
    return rois.map((_, i) => reduced(0.1 * (i + 1), 0.9 - 0.1 * i));
  }
}

const roi = (x: number): Roi => ({x, y: 0, w: 10, h: 10});

describe('selectColor', () => {
  test('picks mean', () => {
    expect(selectColor(reduced(0.25, 0.75), 'mean')).toEqual({
      r: 0.25,
      g: 0.25,
      b: 0.25,
    });
  });

  test('picks dominant', () => {
    expect(selectColor(reduced(0.25, 0.75), 'dominant')).toEqual({
      r: 0.75,
      g: 0.75,
      b: 0.75,
    });
  });
});

describe('getColorFromRoi', () => {
  test('reduces a single ROI with the chosen reducer', async () => {
    const analyzer = new FakeAnalyzer();
    await expect(
      getColorFromRoi(analyzer, roi(5), 'dominant'),
    ).resolves.toEqual({r: 0.9, g: 0.9, b: 0.9});
    expect(analyzer.calls).toEqual([[roi(5)]]);
  });
});

describe('getColorsFromRois', () => {
  test('decodes all ROIs in one pass, order preserved', async () => {
    const analyzer = new FakeAnalyzer();
    const rois = [roi(1), roi(2), roi(3)];
    const colors = await getColorsFromRois(analyzer, rois, 'mean');
    expect(colors).toEqual([
      {r: 0.1, g: 0.1, b: 0.1},
      {r: 0.2, g: 0.2, b: 0.2},
      {r: 0.30000000000000004, g: 0.30000000000000004, b: 0.30000000000000004},
    ]);
    // Single decode pass for all ROIs.
    expect(analyzer.calls).toHaveLength(1);
    expect(analyzer.calls[0]).toEqual(rois);
  });
});
