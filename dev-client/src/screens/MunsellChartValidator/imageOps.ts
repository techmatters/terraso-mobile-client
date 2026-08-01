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

// Row-major RGB image, 3 bytes per pixel (no alpha, no padding),
// values 0..255 in gamma-encoded sRGB — same convention as GrayImage.
// Length of `pixels` is width * height * 3.
export type RgbImage = {
  width: number;
  height: number;
  pixels: Uint8Array;
};

// Rec709 luma of a single RGB triple. Same coefficients the Swift
// grayscale reducer uses, so luminance thresholds cross-check between
// readPreviewGrayscale and readPreviewRgb.
export const rec709Luma = (r: number, g: number, b: number): number =>
  // eslint-disable-next-line no-bitwise -- >>8 is integer divide by 256, hot path
  Math.min(255, (r * 54 + g * 183 + b * 19 + 128) >> 8);

// Reduce an RgbImage to grayscale — used when downstream CV still wants
// luminance-only but we already paid for the RGB fetch (e.g. classifier
// brightness / surroundingContrast).
export const rgbToGray = (rgb: RgbImage): GrayImage => {
  const {width, height, pixels} = rgb;
  const n = width * height;
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = rec709Luma(pixels[i * 3], pixels[i * 3 + 1], pixels[i * 3 + 2]);
  }
  return {width, height, pixels: out};
};

// Build a binary mask marking pixels that look like "paper white":
// bright enough AND near-neutral in chromaticity. Purpose is to give
// the chart-registration pipeline a mask where every swatch hole
// (which shows white paper through it) forms its own isolated 1-region
// enclosed by the chart body's off-white 0-region — so downstream
// distanceTransform + findFlatCircles finds one circle per hole
// without paper margins bleeding in through partial shadow-ring gaps.
//
// Two gates:
//   1. Luminance ≥ (anchor - lumaTolerance) where anchor = the
//      lumaAnchorPercentile of the image's per-pixel luma. Anchor
//      makes the threshold auto-adjust to the capture's white level
//      instead of a fixed 255-based cutoff that fails when the whole
//      capture is dim.
//   2. Chromaticity (max channel spread |R-G|, |G-B|, |R-B|) ≤
//      chromaTolerance. Excludes off-white chart body (warm tint, R>G>B)
//      and colored chips even when their luma also passes the first gate.
//
// The percentile-based anchor is a single global number. Non-uniform
// lighting (half the paper in shadow) is handled by picking a
// permissive lumaTolerance rather than by adaptive local windowing —
// works well enough at the target framings. Add local adaptation if
// this proves brittle.
export type WhiteMaskParams = {
  lumaAnchorPercentile: number;
  lumaTolerance: number;
  chromaTolerance: number;
};

export const DEFAULT_WHITE_MASK_PARAMS: WhiteMaskParams = {
  lumaAnchorPercentile: 0.95,
  lumaTolerance: 60,
  // 7 (was 12) so slightly-warm chart body fails the chroma gate.
  // Chart body reads warmer than paper (R > G > B by ~10-15 grey
  // levels); tighter gate rejects it while paper (near-neutral)
  // and hole interiors (showing white paper through them) still
  // pass. Prevents holes from merging into one wide 1-region via
  // the chart-body gutters between chip columns.
  chromaTolerance: 7,
};

export type WhiteMaskResult = {
  mask: GrayImage;
  lumaAnchor: number;
  lumaCutoff: number;
};

export const whiteMask = (
  rgb: RgbImage,
  params: WhiteMaskParams = DEFAULT_WHITE_MASK_PARAMS,
): WhiteMaskResult => {
  const {width, height, pixels} = rgb;
  const n = width * height;

  // Pass 1 — luma histogram, then walk from the top down to find the
  // luma value at lumaAnchorPercentile.
  const hist = new Uint32Array(256);
  const luma = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const y = rec709Luma(pixels[i * 3], pixels[i * 3 + 1], pixels[i * 3 + 2]);
    luma[i] = y;
    hist[y]++;
  }
  const targetCount = Math.max(
    1,
    Math.floor(n * (1 - params.lumaAnchorPercentile)),
  );
  let acc = 0;
  let anchor = 255;
  for (let v = 255; v >= 0; v--) {
    acc += hist[v];
    if (acc >= targetCount) {
      anchor = v;
      break;
    }
  }
  const cutoff = Math.max(0, anchor - params.lumaTolerance);

  // Pass 2 — apply luma + chroma gates.
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (luma[i] < cutoff) continue;
    const r = pixels[i * 3];
    const g = pixels[i * 3 + 1];
    const b = pixels[i * 3 + 2];
    const rg = Math.abs(r - g);
    const gb = Math.abs(g - b);
    const rb = Math.abs(r - b);
    const chroma = Math.max(rg, gb, rb);
    if (chroma > params.chromaTolerance) continue;
    out[i] = 1;
  }
  return {
    mask: {width, height, pixels: out},
    lumaAnchor: anchor,
    lumaCutoff: cutoff,
  };
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

// Bandpass threshold — foreground where thresholdLow ≤ pixel <
// thresholdHigh. Used to isolate the medium-brightness chart body
// (~100-190 grey) from both the dark swatches / text (< 100) and
// the bright paper background / hole interiors (≥ 190) in one step.
export const bandpass = (
  img: GrayImage,
  thresholdLow: number,
  thresholdHigh: number,
): GrayImage => {
  const {width, height, pixels} = img;
  const out = new Uint8Array(pixels.length);
  for (let i = 0; i < pixels.length; i++) {
    out[i] = pixels[i] >= thresholdLow && pixels[i] < thresholdHigh ? 1 : 0;
  }
  return {width, height, pixels: out};
};

// For every pixel, compute the max-min brightness in a (2r+1)×(2r+1)
// window centred on it. Mark 1 if that spread is below `tolerance`,
// else 0. The output is a mask of "locally flat" pixels — swatch,
// hole, and chart-body interiors show as connected 1-regions;
// boundaries between different-colour regions show as 0-strips
// (window straddles both colours → spread exceeds tolerance).
// Connected-components on this mask cleanly separates each uniform
// region without any risk of gradient-drift merging.
export const localFlatMask = (
  img: GrayImage,
  radius: number,
  tolerance: number,
): GrayImage => {
  const {width, height, pixels} = img;
  const out = new Uint8Array(pixels.length);
  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      let lo = 255;
      let hi = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const row = (y + dy) * width;
        for (let dx = -radius; dx <= radius; dx++) {
          const v = pixels[row + (x + dx)];
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
      }
      if (hi - lo < tolerance) out[y * width + x] = 1;
    }
  }
  return {width, height, pixels: out};
};

// One rectangle found by findFlatRectangles.
export type FlatRect = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

// Scan a binary white mask for rectangles of all-1s. At each unvisited
// 1-pixel, compute the LARGEST all-1s rectangle with that pixel as
// its top-left corner (height-major search: for each candidate
// height, take the min consecutive 1s across those rows starting at
// x, track the max area). Then:
//   - area in [minArea, maxArea]  → KEEP the rectangle, zero the
//                                    pixels it covers so we don't
//                                    re-find it.
//   - area > maxArea              → discard, but ZERO the pixels so
//                                    we don't re-scan the whole
//                                    chart-body / paper region from
//                                    every one of its pixels (that
//                                    would grind on a ~1M-pixel
//                                    region). Safe because chart
//                                    body / paper are separated
//                                    from swatches / holes by the
//                                    boundary 0-strips localFlat
//                                    inserts.
//   - area < minArea              → discard, DON'T zero. Leave the
//                                    pixels so a different corner
//                                    later in the scan can still
//                                    find a larger rectangle that
//                                    happens to include them.
export const findFlatRectangles = (
  mask: GrayImage,
  minArea: number,
  maxArea: number,
): FlatRect[] => {
  const {width, height} = mask;
  // Copy — the caller may still need the original mask (debug
  // overlay for example). Zeroing happens on this working copy.
  const work = new Uint8Array(mask.pixels);
  const rectangles: FlatRect[] = [];
  for (let y = 0; y < height; y++) {
    const rowBase = y * width;
    for (let x = 0; x < width; x++) {
      if (work[rowBase + x] !== 1) continue;
      const {w, h} = largestRectFromTopLeft(work, x, y, width, height);
      const area = w * h;
      if (area >= minArea && area <= maxArea) {
        rectangles.push({
          minX: x,
          minY: y,
          maxX: x + w - 1,
          maxY: y + h - 1,
        });
        zeroRect(work, x, y, w, h, width);
      } else if (area > maxArea) {
        zeroRect(work, x, y, w, h, width);
      }
      // else: too small — leave the 1s intact.
    }
  }
  return rectangles;
};

// Largest all-1s rectangle with (x0, y0) as its top-left corner.
// Row-by-row: at each candidate height h, count the run of 1s
// starting at (y0 + h - 1, x0) and keep the running-min across all
// covered rows; that's the max width for a rectangle of that height.
// The overall winner is the (h, minW) pair with the biggest product.
const largestRectFromTopLeft = (
  work: Uint8Array,
  x0: number,
  y0: number,
  width: number,
  height: number,
): {w: number; h: number} => {
  let maxArea = 0;
  let bestW = 0;
  let bestH = 0;
  let minWSoFar = width - x0;
  for (let h = 1; y0 + h - 1 < height; h++) {
    const rowStart = (y0 + h - 1) * width;
    let w = 0;
    while (x0 + w < width && work[rowStart + x0 + w] === 1) w++;
    if (w === 0) break;
    if (w < minWSoFar) minWSoFar = w;
    const area = minWSoFar * h;
    if (area > maxArea) {
      maxArea = area;
      bestW = minWSoFar;
      bestH = h;
    }
  }
  return {w: bestW, h: bestH};
};

const zeroRect = (
  work: Uint8Array,
  x0: number,
  y0: number,
  w: number,
  h: number,
  width: number,
): void => {
  for (let dy = 0; dy < h; dy++) {
    const rowStart = (y0 + dy) * width;
    for (let dx = 0; dx < w; dx++) work[rowStart + x0 + dx] = 0;
  }
};

// One circle inscribed in a 1-region of the white mask.
export type FlatCircle = {cx: number; cy: number; r: number};

// Two-pass chamfer distance transform. For each foreground (1)
// pixel, computes the distance to the nearest background (0) pixel.
// That distance is the radius of the largest all-1s circle
// centred at that pixel. Uses straight-1 / diagonal-√2 weights
// (close to Euclidean).
export const distanceTransform = (mask: GrayImage): Float32Array => {
  const {width, height, pixels} = mask;
  const dt = new Float32Array(pixels.length);
  const INF = 1e9;
  const D = Math.SQRT2;
  for (let i = 0; i < pixels.length; i++) {
    dt[i] = pixels[i] === 1 ? INF : 0;
  }
  // Forward pass — N, W, NW, NE
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (dt[i] === 0) continue;
      let d = dt[i];
      if (y > 0) {
        const n = dt[i - width] + 1;
        if (n < d) d = n;
        if (x > 0) {
          const nw = dt[i - width - 1] + D;
          if (nw < d) d = nw;
        }
        if (x < width - 1) {
          const ne = dt[i - width + 1] + D;
          if (ne < d) d = ne;
        }
      }
      if (x > 0) {
        const w = dt[i - 1] + 1;
        if (w < d) d = w;
      }
      dt[i] = d;
    }
  }
  // Backward pass — S, E, SE, SW
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      if (dt[i] === 0) continue;
      let d = dt[i];
      if (y < height - 1) {
        const s = dt[i + width] + 1;
        if (s < d) d = s;
        if (x > 0) {
          const sw = dt[i + width - 1] + D;
          if (sw < d) d = sw;
        }
        if (x < width - 1) {
          const se = dt[i + width + 1] + D;
          if (se < d) d = se;
        }
      }
      if (x < width - 1) {
        const e = dt[i + 1] + 1;
        if (e < d) d = e;
      }
      dt[i] = d;
    }
  }
  return dt;
};

// Find non-overlapping circles inscribed in the 1-regions of a
// white mask. Every pixel whose DT value falls in [minRadius,
// maxRadius] is a candidate circle centered there; sort by radius
// descending, greedy-keep the ones that don't overlap any already-
// kept one (overlap = centre-distance < r1 + r2).
//
// Historical note: this used to only consider strict local maxima
// of the DT. That works when every feature (hole) is its own
// isolated 1-region — one local max per region → one detection
// per hole. But when adjacent holes get glued together in the mask
// (e.g. chart body between chip columns passing the whiteMask
// chroma gate), the DT along the connecting corridor is a near-
// constant ridge with no strict local max per hole, so we'd get
// zero detections across the whole merged band. Dropping the
// local-max requirement makes the algorithm robust to that: every
// hole-sized pixel is a candidate, and the greedy overlap rule
// naturally sphere-packs one detection per hole because each
// winning candidate eliminates only within 2 × hole-radius of
// itself (the DT is bounded by hole size in a hole-shaped region).
export const findFlatCircles = (
  mask: GrayImage,
  minRadius: number,
  maxRadius: number,
): FlatCircle[] => {
  const {width, height} = mask;
  const dt = distanceTransform(mask);
  const candidates: FlatCircle[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const d = dt[i];
      if (d < minRadius || d > maxRadius) continue;
      candidates.push({cx: x, cy: y, r: d});
    }
  }
  candidates.sort((a, b) => b.r - a.r);
  const kept: FlatCircle[] = [];
  for (const c of candidates) {
    let overlaps = false;
    for (const k of kept) {
      const dx = c.cx - k.cx;
      const dy = c.cy - k.cy;
      const sumR = c.r + k.r;
      if (dx * dx + dy * dy < sumR * sumR) {
        overlaps = true;
        break;
      }
    }
    if (!overlaps) kept.push(c);
  }
  return kept;
};

// A Region is a Blob (same geometric fields) plus the mean brightness
// of the pixels inside it — used by the region-growing detector to
// classify what KIND of chart feature it might be (dark swatch, bright
// hole, or neither).
export type Region = Blob & {meanBrightness: number};

// Region growing by flood fill with a brightness tolerance around the
// SEED pixel's value (not chained neighbour-to-neighbour, which would
// let gradients drift arbitrarily far from the starting colour). Each
// unvisited pixel starts a new region and expands to 4-connected
// neighbours whose value is within `tolerance` of the seed. Every
// pixel gets visited at most twice — O(N) overall.
//
// Unlike a threshold + CC, this doesn't need a global brightness
// cutoff — dark swatches and bright holes both surface naturally as
// their own uniform regions. Chart body and paper come out as
// too-large regions that the downstream shape filter rejects.
export const regionGrow = (img: GrayImage, tolerance: number): Region[] => {
  const {width, height, pixels} = img;
  const N = pixels.length;
  const labels = new Int32Array(N); // 0 = unvisited
  const stack: number[] = [];
  const regions: Region[] = [];
  let nextLabel = 0;
  for (let seed = 0; seed < N; seed++) {
    if (labels[seed] !== 0) continue;
    nextLabel++;
    const seedValue = pixels[seed];
    const lo = seedValue - tolerance;
    const hi = seedValue + tolerance;
    labels[seed] = nextLabel;
    stack.length = 0;
    stack.push(seed);
    let area = 0;
    let sumX = 0;
    let sumY = 0;
    let sumBrightness = 0;
    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    while (stack.length > 0) {
      const idx = stack.pop()!;
      // eslint-disable-next-line no-bitwise -- |0 is a fast floor for non-negative int
      const y = (idx / width) | 0;
      const x = idx - y * width;
      area++;
      sumX += x;
      sumY += y;
      sumBrightness += pixels[idx];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      if (x > 0) {
        const n = idx - 1;
        if (labels[n] === 0 && pixels[n] >= lo && pixels[n] <= hi) {
          labels[n] = nextLabel;
          stack.push(n);
        }
      }
      if (x < width - 1) {
        const n = idx + 1;
        if (labels[n] === 0 && pixels[n] >= lo && pixels[n] <= hi) {
          labels[n] = nextLabel;
          stack.push(n);
        }
      }
      if (y > 0) {
        const n = idx - width;
        if (labels[n] === 0 && pixels[n] >= lo && pixels[n] <= hi) {
          labels[n] = nextLabel;
          stack.push(n);
        }
      }
      if (y < height - 1) {
        const n = idx + width;
        if (labels[n] === 0 && pixels[n] >= lo && pixels[n] <= hi) {
          labels[n] = nextLabel;
          stack.push(n);
        }
      }
    }
    regions.push({
      label: nextLabel,
      area,
      minX,
      minY,
      maxX,
      maxY,
      cx: sumX / area,
      cy: sumY / area,
      meanBrightness: sumBrightness / area,
    });
  }
  return regions;
};

// Encode a binary mask as horizontal RLE spans, with rows grouped
// by `rowStride` (row-wise OR within each group) to keep the span
// count manageable. Used purely for the debug overlay — lets the
// SourceOverlayView show the actual mask on top of the source
// image with a handful of hundreds of SVG rects instead of tens of
// thousands.
export const maskToSpans = (
  mask: GrayImage,
  rowStride: number = 4,
): {x: number; y: number; w: number; h: number}[] => {
  const spans: {x: number; y: number; w: number; h: number}[] = [];
  const {width, height, pixels} = mask;
  for (let y = 0; y < height; y += rowStride) {
    const groupH = Math.min(rowStride, height - y);
    let inSpan = false;
    let spanStart = 0;
    for (let x = 0; x < width; x++) {
      let any = 0;
      for (let dy = 0; dy < groupH; dy++) {
        if (pixels[(y + dy) * width + x] === 1) {
          any = 1;
          break;
        }
      }
      if (any === 1 && !inSpan) {
        inSpan = true;
        spanStart = x;
      } else if (any === 0 && inSpan) {
        spans.push({x: spanStart, y, w: x - spanStart, h: groupH});
        inSpan = false;
      }
    }
    if (inSpan) spans.push({x: spanStart, y, w: width - spanStart, h: groupH});
  }
  return spans;
};

// 4-connected erosion by 1 pixel. A foreground pixel survives only if
// all four of its N/S/E/W neighbours are also foreground; boundary
// pixels are treated as background. Used to break 1-pixel bridges
// between blobs that should have been separate (adjacent dark
// swatches whose edges bleed together at the threshold step).
export const erode1 = (mask: GrayImage): GrayImage => {
  const {width, height, pixels} = mask;
  const out = new Uint8Array(pixels.length);
  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    for (let x = 1; x < width - 1; x++) {
      const i = row + x;
      if (
        pixels[i] === 1 &&
        pixels[i - 1] === 1 &&
        pixels[i + 1] === 1 &&
        pixels[i - width] === 1 &&
        pixels[i + width] === 1
      ) {
        out[i] = 1;
      }
    }
  }
  return {width, height, pixels: out};
};

// 4-connected dilation by 1 pixel — a background pixel becomes
// foreground if any of its N/S/E/W neighbours are foreground. Paired
// with erode1 to form a morphological OPEN (erode → dilate). The
// combination breaks thin bridges without shrinking the surviving
// blobs, so cell sizes downstream stay meaningful.
export const dilate1 = (mask: GrayImage): GrayImage => {
  const {width, height, pixels} = mask;
  const out = new Uint8Array(pixels.length);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const i = row + x;
      if (
        pixels[i] === 1 ||
        (x > 0 && pixels[i - 1] === 1) ||
        (x < width - 1 && pixels[i + 1] === 1) ||
        (y > 0 && pixels[i - width] === 1) ||
        (y < height - 1 && pixels[i + width] === 1)
      ) {
        out[i] = 1;
      }
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
