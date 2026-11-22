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
  defaultKept,
  histogramFromImage,
  keptAverageLinear,
  linearLuminance,
  maskRgba,
  type ColorBucket,
  type RoiPreview,
} from 'terraso-mobile-client/model/color/dominantHistogram';

const bucket = (
  mean: [number, number, number],
  count: number,
): ColorBucket => ({
  mean: {r: mean[0], g: mean[1], b: mean[2]},
  count,
});

// Build a solid-colour-region RGBA image: `regions` is [r,g,b,pixelCount] and
// pixels are laid out row-major as one long strip (width = total, height = 1).
const imageFromRegions = (regions: [number, number, number, number][]) => {
  const total = regions.reduce((n, [, , , c]) => n + c, 0);
  const data = new Uint8Array(total * 4);
  let o = 0;
  for (const [r, g, b, count] of regions) {
    for (let i = 0; i < count; i++) {
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = b;
      data[o + 3] = 255;
      o += 4;
    }
  }
  return {data, width: total, height: 1};
};

describe('keptAverageLinear', () => {
  const buckets = [bucket([1, 0, 0], 3), bucket([0, 0, 0], 1)];

  test('weights by pixel count', () => {
    expect(keptAverageLinear(buckets, new Set([0, 1]))).toEqual({
      r: 0.75,
      g: 0,
      b: 0,
    });
  });

  test('only kept buckets contribute', () => {
    expect(keptAverageLinear(buckets, new Set([0]))).toEqual({
      r: 1,
      g: 0,
      b: 0,
    });
  });

  test('empty kept set → zero', () => {
    expect(keptAverageLinear(buckets, new Set())).toEqual({r: 0, g: 0, b: 0});
  });
});

describe('defaultKept', () => {
  test('keeps the single bucket', () => {
    expect(defaultKept([bucket([0.1, 0.1, 0.1], 5)])).toEqual(new Set([0]));
  });

  test('drops a much-darker darkest bucket (shadow)', () => {
    const kept = defaultKept([
      bucket([0.8, 0.8, 0.8], 5),
      bucket([0.05, 0.05, 0.05], 2),
    ]);
    expect(kept).toEqual(new Set([0]));
  });

  test('keeps a darkest bucket that is only slightly darker', () => {
    const kept = defaultKept([
      bucket([0.5, 0.5, 0.5], 5),
      bucket([0.4, 0.4, 0.4], 2),
    ]);
    expect(kept).toEqual(new Set([0, 1]));
  });
});

describe('linearLuminance', () => {
  test('is the Rec.709 weighting', () => {
    expect(linearLuminance({r: 1, g: 0, b: 0})).toBeCloseTo(0.2126, 6);
    expect(linearLuminance({r: 0, g: 1, b: 0})).toBeCloseTo(0.7152, 6);
    expect(linearLuminance({r: 0, g: 0, b: 1})).toBeCloseTo(0.0722, 6);
  });
});

describe('maskRgba', () => {
  // 3 pixels: bucket 0, bucket 1, bucket 0.
  const preview: RoiPreview = {
    width: 3,
    height: 1,
    rgb: new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80, 90]),
    bucket: new Uint8Array([0, 1, 0]),
  };

  test('keeps kept-bucket pixels and whitens the rest', () => {
    const out = maskRgba(preview, new Set([0]));
    // pixel 0 (bucket 0, kept) keeps colour
    expect([out[0], out[1], out[2], out[3]]).toEqual([10, 20, 30, 255]);
    // pixel 1 (bucket 1, dropped) → white
    expect([out[4], out[5], out[6], out[7]]).toEqual([255, 255, 255, 255]);
    // pixel 2 (bucket 0, kept) keeps colour
    expect([out[8], out[9], out[10], out[11]]).toEqual([70, 80, 90, 255]);
  });

  test('all white when nothing kept', () => {
    const out = maskRgba(preview, new Set());
    for (let i = 0; i < 3; i++) {
      expect(out[i * 4]).toBe(255);
      expect(out[i * 4 + 3]).toBe(255);
    }
  });
});

describe('histogramFromImage', () => {
  // 300 red + 100 blue pixels.
  const img = imageFromRegions([
    [200, 40, 40, 300],
    [40, 40, 200, 100],
  ]);
  const hist = histogramFromImage(img);

  test('bucket counts sum to the opaque pixel total', () => {
    const total = hist.buckets.reduce((n, b) => n + b.count, 0);
    expect(total).toBe(400);
  });

  test('buckets are ordered most-common first', () => {
    for (let i = 1; i < hist.buckets.length; i++) {
      expect(hist.buckets[i - 1].count).toBeGreaterThanOrEqual(
        hist.buckets[i].count,
      );
    }
  });

  test('the dominant bucket is the majority (red) colour', () => {
    const top = hist.buckets[0];
    expect(top.count).toBe(300);
    expect(top.mean.r).toBeGreaterThan(top.mean.b);
  });

  test('all bucket means are in [0,1]', () => {
    for (const b of hist.buckets) {
      for (const v of [b.mean.r, b.mean.g, b.mean.b]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  test('preview buffers are consistently sized', () => {
    const {width, height, rgb, bucket: bucketMap} = hist.preview;
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
    expect(rgb.length).toBe(width * height * 3);
    expect(bucketMap.length).toBe(width * height);
    // Every preview pixel references a real bucket.
    for (const idx of bucketMap) {
      expect(idx).toBeLessThan(hist.buckets.length);
    }
  });
});
