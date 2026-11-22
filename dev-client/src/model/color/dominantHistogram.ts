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

import quantize from 'quantize';

import {
  linearToSrgb255,
  srgb255ToLinear,
} from 'terraso-mobile-client/model/color/colorDetection';
import type {LinearRgb} from 'terraso-mobile-client/model/rawColor/types';

// Number of colour buckets the median-cut quantiser produces for the editor.
// Higher than the legacy dominantColor's 5 so the histogram is granular enough
// to let the user split shadow / off-tone flecks from the real colour.
export const DEFAULT_PALETTE_SIZE = 8;

// Longest edge of the downsampled preview used for the live mask. The mask is
// rebuilt on every checkbox toggle, so this bounds the per-toggle work; the
// bucket means/counts are still computed on the full-resolution crop.
const DEFAULT_PREVIEW_MAX_DIM = 160;

// A quantised colour cluster: the exact LINEAR mean of its pixels and how many
// pixels fell in it. The linear mean (not the 8-bit quantiser representative)
// is what the kept-average math consumes, so the measured colour stays on the
// same linear scale as the rest of the pipeline.
export type ColorBucket = {
  mean: LinearRgb;
  count: number;
};

// Downsampled raster for the live mask: per-pixel display colour (gamma sRGB,
// 3 bytes/pixel) plus the bucket index each pixel belongs to (1 byte/pixel).
// The editor whitens every pixel whose bucket is unchecked.
export type RoiPreview = {
  width: number;
  height: number;
  rgb: Uint8Array;
  bucket: Uint8Array;
};

// The data the dominant-colour editor works from, identical in shape whether it
// was produced in JS (JPEG/HEIC/PNG crops, histogramFromImage below) or natively
// from raw DNG sensor pixels. Buckets are ordered most-common first.
export type RoiHistogram = {
  buckets: ColorBucket[];
  preview: RoiPreview;
};

export type DecodedImage = {
  // RGBA, 4 bytes per pixel, row-major (the jpeg-js decode shape).
  data: Uint8Array | Uint8ClampedArray | number[];
  width: number;
  height: number;
};

const colorKey = (c: quantize.RgbPixel): number =>
  c[0] * 65536 + c[1] * 256 + c[2];

// Rec.709 relative luminance of a linear-RGB colour.
export const linearLuminance = (c: LinearRgb): number =>
  0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

// Bucket mean as a display sRGB-255 triple (for swatches / histogram bars).
export const bucketDisplayRgb = (
  bucket: ColorBucket,
): [number, number, number] => [
  linearToSrgb255(bucket.mean.r),
  linearToSrgb255(bucket.mean.g),
  linearToSrgb255(bucket.mean.b),
];

/**
 * Build the dominant-colour histogram for a decoded crop. Runs the same
 * median-cut quantiser the legacy dominantColor uses, but keeps ALL buckets
 * (with exact linear per-bucket means + pixel counts) and a downsampled
 * per-pixel bucket-index map for the live mask. Buckets are sorted most-common
 * first.
 */
export const histogramFromImage = (
  img: DecodedImage,
  opts?: {paletteSize?: number; previewMaxDim?: number},
): RoiHistogram => {
  const paletteSize = opts?.paletteSize ?? DEFAULT_PALETTE_SIZE;
  const previewMaxDim = opts?.previewMaxDim ?? DEFAULT_PREVIEW_MAX_DIM;
  const {data, width, height} = img;

  const px = (offset: number): quantize.RgbPixel => [
    data[offset],
    data[offset + 1],
    data[offset + 2],
  ];

  // Collect opaque pixels for the quantiser.
  const samples: quantize.RgbPixel[] = [];
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    if (data[o + 3] >= 125) {
      samples.push(px(o));
    }
  }

  const cmap = samples.length > 0 ? quantize(samples, paletteSize) : false;
  if (!cmap) {
    // Degenerate crop (empty / all identical): one bucket = overall mean.
    return singleBucketHistogram(img, previewMaxDim);
  }

  // Stable index per palette colour, in the quantiser's own order for now.
  const rawPalette = cmap.vboxes.map(o => o.color);
  const indexByKey = new Map<number, number>();
  rawPalette.forEach((c, i) => indexByKey.set(colorKey(c), i));
  const bucketOf = (p: quantize.RgbPixel): number =>
    indexByKey.get(colorKey(cmap.map(p))) ?? 0;

  // Exact linear sums + counts per raw bucket, over the FULL crop.
  const n = rawPalette.length;
  const sum = Array.from({length: n}, () => ({r: 0, g: 0, b: 0, count: 0}));
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    if (data[o + 3] < 125) {
      continue;
    }
    const idx = bucketOf(px(o));
    const s = sum[idx];
    s.r += srgb255ToLinear(data[o]);
    s.g += srgb255ToLinear(data[o + 1]);
    s.b += srgb255ToLinear(data[o + 2]);
    s.count += 1;
  }

  // Build buckets, drop empties, sort most-common first. remap[rawIdx] = newIdx.
  const ordered = sum
    .map((s, rawIdx) => ({s, rawIdx}))
    .filter(({s}) => s.count > 0)
    .sort((a, b) => b.s.count - a.s.count);
  const remap = new Map<number, number>();
  const buckets: ColorBucket[] = ordered.map(({s, rawIdx}, newIdx) => {
    remap.set(rawIdx, newIdx);
    return {
      mean: {r: s.r / s.count, g: s.g / s.count, b: s.b / s.count},
      count: s.count,
    };
  });

  const preview = buildPreview(img, previewMaxDim, p => remap.get(bucketOf(p)));
  return {buckets, preview};
};

// Downsample the crop (nearest-neighbour) into display RGB + per-pixel bucket
// index via the supplied classifier.
const buildPreview = (
  img: DecodedImage,
  maxDim: number,
  classify: (p: quantize.RgbPixel) => number | undefined,
): RoiPreview => {
  const {data, width, height} = img;
  const scale = Math.max(1, Math.ceil(Math.max(width, height) / maxDim));
  const pw = Math.max(1, Math.ceil(width / scale));
  const ph = Math.max(1, Math.ceil(height / scale));
  const rgb = new Uint8Array(pw * ph * 3);
  const bucket = new Uint8Array(pw * ph);
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      const sx = Math.min(width - 1, x * scale);
      const sy = Math.min(height - 1, y * scale);
      const o = (sy * width + sx) * 4;
      const d = (y * pw + x) * 3;
      rgb[d] = data[o];
      rgb[d + 1] = data[o + 1];
      rgb[d + 2] = data[o + 2];
      bucket[y * pw + x] = classify([data[o], data[o + 1], data[o + 2]]) ?? 0;
    }
  }
  return {width: pw, height: ph, rgb, bucket};
};

const singleBucketHistogram = (
  img: DecodedImage,
  previewMaxDim: number,
): RoiHistogram => {
  const {data, width, height} = img;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    if (data[o + 3] < 125) {
      continue;
    }
    r += srgb255ToLinear(data[o]);
    g += srgb255ToLinear(data[o + 1]);
    b += srgb255ToLinear(data[o + 2]);
    count += 1;
  }
  const mean =
    count > 0 ? {r: r / count, g: g / count, b: b / count} : {r: 0, g: 0, b: 0};
  return {
    buckets: [{mean, count}],
    preview: buildPreview(img, previewMaxDim, () => 0),
  };
};

/**
 * Build an RGBA buffer from a preview where every pixel whose bucket is NOT in
 * `kept` is painted white. This is what the editor renders (encoded to a JPEG
 * data URI) as the live mask; kept pixels keep their original display colour.
 */
export const maskRgba = (
  preview: RoiPreview,
  kept: ReadonlySet<number>,
): Uint8Array => {
  const {width, height, rgb, bucket} = preview;
  const out = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const o3 = i * 3;
    const o4 = i * 4;
    if (kept.has(bucket[i])) {
      out[o4] = rgb[o3];
      out[o4 + 1] = rgb[o3 + 1];
      out[o4 + 2] = rgb[o3 + 2];
    } else {
      out[o4] = 255;
      out[o4 + 1] = 255;
      out[o4 + 2] = 255;
    }
    out[o4 + 3] = 255;
  }
  return out;
};

/**
 * True linear mean of every pixel in the kept buckets:
 *   Σ(mean_i · count_i) / Σ(count_i)  over kept i.
 * Because mean_i is the exact linear mean of bucket i, this equals the exact
 * linear mean of all kept pixels — no per-pixel linear data required.
 */
export const keptAverageLinear = (
  buckets: ColorBucket[],
  kept: ReadonlySet<number>,
): LinearRgb => {
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  buckets.forEach((bucket, i) => {
    if (!kept.has(i)) {
      return;
    }
    r += bucket.mean.r * bucket.count;
    g += bucket.mean.g * bucket.count;
    b += bucket.mean.b * bucket.count;
    count += bucket.count;
  });
  return count > 0
    ? {r: r / count, g: g / count, b: b / count}
    : {r: 0, g: 0, b: 0};
};

// Darkest bucket is treated as shadow and unchecked by default when its
// luminance is this fraction (or less) of the next-darkest bucket's. Tunable.
const SHADOW_LUMINANCE_RATIO = 0.5;

/**
 * Default checked set: every bucket except the darkest, when that darkest is
 * much darker than the rest (likely cast shadow). With fewer than two buckets,
 * or no clear outlier, everything is kept.
 */
export const defaultKept = (buckets: ColorBucket[]): Set<number> => {
  const kept = new Set(buckets.map((_, i) => i));
  if (buckets.length < 2) {
    return kept;
  }
  const byLum = buckets
    .map((bucket, i) => ({i, lum: linearLuminance(bucket.mean)}))
    .sort((a, b) => a.lum - b.lum);
  const darkest = byLum[0];
  const nextDarkest = byLum[1];
  if (darkest.lum <= nextDarkest.lum * SHADOW_LUMINANCE_RATIO) {
    kept.delete(darkest.i);
  }
  return kept;
};
