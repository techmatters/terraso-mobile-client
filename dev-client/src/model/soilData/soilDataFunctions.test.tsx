/*
 * Copyright © 2021-2023 Technology Matters
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
  compareInterval,
  depthIntervalKey,
  methodEnabled,
  methodRequired,
  overlaps,
  sameDepth,
} from 'terraso-mobile-client/model/soilData/soilDataFunctions';

describe('methodEnabled', () => {
  test('formats method names with the Enabled suffix', () => {
    expect(methodEnabled('soilTexture')).toBe('soilTextureEnabled');
  });
});

describe('methodRequired', () => {
  test('formats method names with the Required suffix', () => {
    expect(methodRequired('soilTexture')).toBe('soilTextureRequired');
  });
});

describe('depthIntervalKey', () => {
  test('generates a key from start and end', () => {
    expect(depthIntervalKey({start: 1, end: 2})).toEqual('1-2');
  });
});

describe('sameDepth', () => {
  test('matches identical depth intervals', () => {
    const a = {depthInterval: {start: 1, end: 2}};
    const b = {depthInterval: {start: 1, end: 2}};

    expect(sameDepth(a)(b)).toBeTruthy();
  });

  test('rejects different starts', () => {
    const a = {depthInterval: {start: 1, end: 2}};
    const c = {depthInterval: {start: 10, end: 2}};

    expect(sameDepth(a)(c)).toBeFalsy();
  });

  test('rejects different ends', () => {
    const a = {depthInterval: {start: 1, end: 2}};
    const d = {depthInterval: {start: 1, end: 20}};

    expect(sameDepth(a)(d)).toBeFalsy();
  });
});

describe('overlaps', () => {
  test('accepts identical intervals', () => {
    const a = {depthInterval: {start: 1, end: 2}};
    const b = {depthInterval: {start: 1, end: 2}};

    expect(overlaps(a)(b)).toBeTruthy();
  });

  test('accepts intervals overlapping at the start', () => {
    const a = {depthInterval: {start: 1, end: 2}};
    const b = {depthInterval: {start: 0, end: 1.1}};

    expect(overlaps(a)(b)).toBeTruthy();
  });

  test('accepts intervals overlapping at the end', () => {
    const a = {depthInterval: {start: 1, end: 2}};
    const b = {depthInterval: {start: 1.9, end: 3}};

    expect(overlaps(a)(b)).toBeTruthy();
  });

  test('rejects intervals fully before', () => {
    const a = {depthInterval: {start: 1, end: 2}};
    const b = {depthInterval: {start: 2, end: 3}};

    expect(overlaps(a)(b)).toBeFalsy();
  });

  test('rejects intervals fully after', () => {
    const a = {depthInterval: {start: 1, end: 2}};
    const b = {depthInterval: {start: 0, end: 1}};

    expect(overlaps(a)(b)).toBeFalsy();
  });
});

describe('compareInterval', () => {
  test('compares based on start value', () => {
    const a = {depthInterval: {start: 0, end: 2}};
    const b = {depthInterval: {start: -1, end: 2}};
    const c = {depthInterval: {start: 1, end: 2}};

    expect(compareInterval(a, b)).toBeGreaterThan(0);
    expect(compareInterval(a, a)).toEqual(0);
    expect(compareInterval(a, c)).toBeLessThan(0);
  });

  test('can be used to sort intervals', () => {
    const a = {depthInterval: {start: 0, end: 2}};
    const b = {depthInterval: {start: -1, end: 2}};
    const c = {depthInterval: {start: 1, end: 2}};

    const sorted = [c, b, a].sort(compareInterval);

    expect(sorted).toEqual([b, a, c]);
  });
});
