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

// Basic 8-bit grayscale image ops for the Munsell chart auto-
// registration pipeline. Written to be simple + allocation-light —
// runs once per capture on a downsampled image (~1200px longest edge,
// so ~1M pixels), not in a tight per-frame loop.

export type GrayImage = {
  width: number;
  height: number;
  // Row-major, one byte per pixel, values 0..255.
  pixels: Uint8Array;
};

// Threshold every pixel. Default: 1 if pixel >= `threshold`, else 0.
// With `invert: true`: 1 if pixel < `threshold`, else 0 — useful for
// isolating dark regions (e.g. the chart's swatches). Output is a
// same-shape mask packed as Uint8Array of 0/1 values (not bit
// packing — clarity > space here).
export const threshold = (
  img: GrayImage,
  thresholdValue: number,
  invert: boolean = false,
): GrayImage => {
  const {width, height, pixels} = img;
  const out = new Uint8Array(pixels.length);
  if (invert) {
    for (let i = 0; i < pixels.length; i++) {
      out[i] = pixels[i] < thresholdValue ? 1 : 0;
    }
  } else {
    for (let i = 0; i < pixels.length; i++) {
      out[i] = pixels[i] >= thresholdValue ? 1 : 0;
    }
  }
  return {width, height, pixels: out};
};

export type Blob = {
  label: number;
  area: number;
  // Bounding box in image pixel coords (inclusive on all sides).
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  // Centroid (mean pixel position, in pixels).
  cx: number;
  cy: number;
};

// Two-pass connected-component labeling with 4-neighbor connectivity
// and a union-find backend. Foreground = mask pixel == 1. Returns one
// Blob per connected component; label 0 is background and is not
// returned.
//
// Union-find implemented as an int array where parents[i] eventually
// resolves to the root label for i. Path compression happens on read.
export const connectedComponents = (mask: GrayImage): Blob[] => {
  const {width: w, height: h, pixels} = mask;
  // labels[y*w+x] holds the *provisional* label for that pixel. 0 is
  // background. Provisional labels are unified into final labels via
  // the parents[] union-find in pass 2.
  const labels = new Int32Array(w * h);
  const parents: number[] = [0]; // parents[0] is unused (0 = background sentinel)
  let nextLabel = 1;

  const find = (x: number): number => {
    let root = x;
    while (parents[root] !== root) root = parents[root];
    // Path compression: walk again setting each node's parent to root.
    let cur = x;
    while (parents[cur] !== root) {
      const next = parents[cur];
      parents[cur] = root;
      cur = next;
    }
    return root;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra === rb) return;
    // Smaller label wins — makes final labels tighter for a
    // top-to-bottom sweep.
    if (ra < rb) parents[rb] = ra;
    else parents[ra] = rb;
  };

  // Pass 1: assign provisional labels + record label equivalences.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (pixels[idx] === 0) continue;
      const leftLabel = x > 0 ? labels[idx - 1] : 0;
      const upLabel = y > 0 ? labels[idx - w] : 0;
      if (leftLabel === 0 && upLabel === 0) {
        // New label.
        labels[idx] = nextLabel;
        parents[nextLabel] = nextLabel;
        nextLabel++;
      } else if (leftLabel !== 0 && upLabel === 0) {
        labels[idx] = leftLabel;
      } else if (leftLabel === 0 && upLabel !== 0) {
        labels[idx] = upLabel;
      } else {
        // Both neighbors labeled — take smaller, union them.
        const smaller = leftLabel < upLabel ? leftLabel : upLabel;
        labels[idx] = smaller;
        if (leftLabel !== upLabel) union(leftLabel, upLabel);
      }
    }
  }

  // Pass 2: resolve labels + accumulate blob stats.
  const stats = new Map<
    number,
    {
      area: number;
      sumX: number;
      sumY: number;
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    }
  >();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const l = labels[y * w + x];
      if (l === 0) continue;
      const root = find(l);
      let s = stats.get(root);
      if (!s) {
        s = {area: 0, sumX: 0, sumY: 0, minX: x, minY: y, maxX: x, maxY: y};
        stats.set(root, s);
      }
      s.area++;
      s.sumX += x;
      s.sumY += y;
      if (x < s.minX) s.minX = x;
      if (y < s.minY) s.minY = y;
      if (x > s.maxX) s.maxX = x;
      if (y > s.maxY) s.maxY = y;
    }
  }

  const blobs: Blob[] = [];
  for (const [label, s] of stats) {
    blobs.push({
      label,
      area: s.area,
      minX: s.minX,
      minY: s.minY,
      maxX: s.maxX,
      maxY: s.maxY,
      cx: s.sumX / s.area,
      cy: s.sumY / s.area,
    });
  }
  return blobs;
};

// Bounding box dimensions in pixels.
export const blobW = (b: Blob): number => b.maxX - b.minX + 1;
export const blobH = (b: Blob): number => b.maxY - b.minY + 1;

// Aspect ratio: long side / short side. Always >= 1. Useful for
// telling round blobs (fiducial holes, ratio ~1) from oval cutouts
// (ratio ~1.3-1.5).
export const blobAspect = (b: Blob): number => {
  const bw = blobW(b);
  const bh = blobH(b);
  return bw >= bh ? bw / bh : bh / bw;
};

// Fill ratio of the blob's bounding box: blob.area / (bw * bh).
// Solid blobs (rectangles) approach 1.0, holes / ring shapes stay
// well below. For our chart the swatch backgrounds and cutouts are
// all near-solid regions so this stays > ~0.7.
export const blobFillRatio = (b: Blob): number => {
  return b.area / (blobW(b) * blobH(b));
};
