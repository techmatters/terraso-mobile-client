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

// Build a binary mask marking pixels that look like "paper white".
//
// PREFERRED path (when `guideRect` is provided and the border ring
// has enough samples): calibrate from a ring of pixels OUTSIDE the
// capture-time chart guide but INSIDE a small outer margin — the ring
// is very likely to be pure paper background, so its per-channel
// medians tell us exactly what "paper" looks like in this specific
// capture (warm tint, cool tint, dim, bright — whatever). Median +
// MAD (median-absolute-deviation) is robust to a Post-It or hand
// that lands partially in the ring: it takes >50% contamination to
// shift the estimator.
//
// A pixel is "paper" if its per-channel value is within
// max(MIN_CHANNEL_TOL, k × MAD) of the ring's per-channel median.
// Uses per-channel bounds (not a chromaticity spread gate) because
// the ring tells us the paper's actual R, G, B — no need to assume
// neutrality.
//
// FALLBACK path (guide rect not supplied, or border has <
// borderMinSamples pixels): a percentile-based luma anchor + fixed
// chroma spread gate. Same behaviour as the original whiteMask.
//   1. Luminance ≥ (anchor - lumaTolerance) where anchor = the
//      lumaAnchorPercentile of the image's per-pixel luma.
//   2. Chromaticity (max channel spread |R-G|, |G-B|, |R-B|) ≤
//      chromaTolerance.
// The fallback works for near-neutral paper under near-neutral light
// but silently fails under warm/cool ambient — this is exactly the
// case the border calibration is here to fix.
export type WhiteMaskParams = {
  // Fallback (percentile) path.
  lumaAnchorPercentile: number;
  lumaTolerance: number;
  chromaTolerance: number;
  // Border-calibration path.
  //
  // The sample ring is the annulus between:
  //   OUTER boundary: `outerMargin = borderOuterMarginFrac × shortDim`
  //                   INWARD from the frame edge (paper-white pixels
  //                   too close to the actual frame edge may be dim
  //                   from vignetting / grip shadow — skip them).
  //   INNER boundary: `innerBuf = borderInnerBufferFrac × shortDim`
  //                   OUTWARD from the (hypothetical) chart guide rect
  //                   the user framed against. Anything inside this is
  //                   assumed to potentially be chart body / chip / tape
  //                   / hand and must not contaminate the paper
  //                   estimate. shortDim = min(image w, h) so the same
  //                   percentages work regardless of orientation.
  //
  // The dev overlay in MunsellChartValidatorScreen draws both boundaries
  // as white dashed rects so a tester can eyeball what's actually in
  // the sample area on any given capture.
  //
  // WATCH OUT: when the guide + innerBuf reaches an image edge before
  // the outer margin does, the ring COLLAPSES to zero pixels on that
  // edge and only the other edges contribute. This is easy on the
  // top and bottom because the 4.5:7 chart guide is tall and centres
  // vertically with small margins — a big innerBuf can push the dead
  // zone past the frame edge there while the left/right ring is still
  // fat. Effective sample count comes almost entirely from whichever
  // edges retain any ring. Keep innerBuf small enough that all four
  // edges stay non-degenerate for a typical framing (guide close to
  // the frame edge on the short axis).
  borderInnerBufferFrac: number; // fraction of shortDim
  borderOuterMarginFrac: number; // fraction of shortDim
  // If the ring produces fewer than this many sample pixels, we fall
  // back to the percentile path — happens on loaded photos with weird
  // aspects or extreme framing that leaves no paper visible.
  borderMinSamples: number;
  // Only the TOP borderLumaKeepFrac of ring pixels by luma feed into
  // the R/G/B median + MAD. Auto-excludes shadow regions in the ring
  // (bottom edge of a chart on a table lit from one side, phone
  // shadow, etc.). 0.6 keeps 60% brightest, drops 40% (comfortably
  // more than any real shadow occupies).
  borderLumaKeepFrac: number;
  // Per-channel tolerance = max(borderMinChannelTolerance, k × MAD)
  // where k is borderChannelToleranceMultiplier. Widening lets more
  // chart-body speckle leak in; tightening may exclude paper regions
  // that look slightly different through hole interiors.
  borderChannelToleranceMultiplier: number;
  borderMinChannelTolerance: number;
  // Paper-relative chroma-spread gate. For each pixel compute
  // (dr, dg, db) = (r-medR, g-medG, b-medB) — the OFFSET from paper's
  // own chromaticity. Then require max(|dr-dg|, |dg-db|, |dr-db|) <
  // this value. Rejects pixels whose color has shifted in a
  // DIFFERENT direction from paper (warm chart body, near-white
  // chips) while still accepting shadowed paper (equal darkening
  // across channels → all three deltas move together → spread ≈ 0).
  borderChromaSpreadTolerance: number;
};

export const DEFAULT_WHITE_MASK_PARAMS: WhiteMaskParams = {
  // Fallback params — matched to the original whiteMask defaults so
  // captures without a guide behave identically to before.
  lumaAnchorPercentile: 0.95,
  lumaTolerance: 60,
  chromaTolerance: 7,
  // Border-calibration params.
  //
  // 0.04 innerBuf keeps the top and bottom ring strips non-degenerate
  // for the standard 4.5:7 chart guide in a portrait preview: at 0.08
  // the dead zone reached past the outer margin on top/bottom (guide
  // is tall) and 93% of the samples came from just the left/right
  // vertical strips. Blue painter's tape at the corners then dominated
  // those strips and pulled the paper anchor cool. 0.04 fattens all
  // four sides, spreading the sample across more paper and diluting
  // localised contamination. Any value < ~0.06 works for portrait 3:4;
  // shrinking further starts risking chart body creeping into the ring
  // if the user framed close to the guide edge.
  borderInnerBufferFrac: 0.04,
  borderOuterMarginFrac: 0.05,
  borderMinSamples: 2000,
  // Effectively disable the shadow trim (1.0 → keep all ring pixels).
  // Trimming biased calibration toward one brightness band, and once
  // per-channel bounds tightened around the biased median, dim paper
  // failed per-channel and got dropped from the mask. Under a lighting
  // gradient the whole ring is real paper — median is robust to shadow
  // via median-not-mean, so no trim is needed. Keep the knob for
  // future tuning if a pathological capture demands it.
  borderLumaKeepFrac: 1.0,
  // Per-channel bounds are now the LOOSE gate — its job is just to
  // reject very-dark chips (values 2-6, deviation 50+ from paper on
  // most channels). The chroma-spread gate below is the tight filter.
  // 45 grey levels covers paper variation across strong lighting
  // gradients (~30-40 delta between brightest and dimmest paper).
  borderChannelToleranceMultiplier: 4,
  borderMinChannelTolerance: 45,
  // Chroma-spread gate — primary filter. 10 admits real paper (spread
  // 3-8 depending on capture noise) while rejecting chart body
  // (spread 15-20 due to warm tint) and near-white chips (spread
  // 15+ due to warm shift). Was 6 which was too tight under noise.
  // TEMPORARY: raised to 20 to test whether bright_paper chip holes
  // fill in more completely (currently only ~50% of each hole passes
  // the gate). Revert to 10 once the experiment concludes.
  borderChromaSpreadTolerance: 20,
};

export type WhiteMaskResult = {
  mask: GrayImage;
  // Fallback-path outputs. Always populated on fallback; on border-
  // calibration they're computed too so a dev can compare, but not
  // used to build the mask.
  lumaAnchor: number;
  lumaCutoff: number;
  // Border-calibration outputs. Non-null only when border calibration
  // was actually used to build the mask (i.e. guideRect supplied AND
  // borderSampleCount ≥ borderMinSamples). null on fallback.
  borderMedianR: number | null;
  borderMedianG: number | null;
  borderMedianB: number | null;
  borderMadR: number | null;
  borderMadG: number | null;
  borderMadB: number | null;
  borderSampleCount: number;
  usedBorderCalibration: boolean;
};

// Rectangle in pixel coords, half-open on the max side (max is one
// past the last pixel — same convention as slicing).
type Rect = {minX: number; minY: number; maxX: number; maxY: number};

// Median of a 0-255 integer histogram (Uint32Array of length 256).
const medianFromHist = (hist: Uint32Array, totalCount: number): number => {
  const half = totalCount / 2;
  let acc = 0;
  for (let v = 0; v <= 255; v++) {
    acc += hist[v];
    if (acc >= half) return v;
  }
  return 255;
};

export const whiteMask = (
  rgb: RgbImage,
  params: WhiteMaskParams = DEFAULT_WHITE_MASK_PARAMS,
  // If provided, tries the border-calibration path first. If the ring
  // yields too few samples, silently falls back to the percentile path.
  guideRect?: {x: number; y: number; w: number; h: number},
): WhiteMaskResult => {
  const {width, height, pixels} = rgb;
  const n = width * height;

  // ── Fallback-path prelude: compute the percentile-based luma anchor.
  // Kept even on the border path so its values still show up in the
  // returned struct for debug logging.
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

  // ── Border-calibration path (when a guide is supplied).
  if (guideRect) {
    const shortDim = Math.min(width, height);
    const innerBuf = shortDim * params.borderInnerBufferFrac;
    const outerMargin = shortDim * params.borderOuterMarginFrac;
    // Extended guide (dead zone in the middle) and inner-image bounds
    // (outer sample cap). Clamped to image bounds so a mis-computed
    // guide can't send us out of range.
    const dead: Rect = {
      minX: Math.max(0, Math.floor(guideRect.x - innerBuf)),
      minY: Math.max(0, Math.floor(guideRect.y - innerBuf)),
      maxX: Math.min(width, Math.ceil(guideRect.x + guideRect.w + innerBuf)),
      maxY: Math.min(height, Math.ceil(guideRect.y + guideRect.h + innerBuf)),
    };
    const outer: Rect = {
      minX: Math.max(0, Math.floor(outerMargin)),
      minY: Math.max(0, Math.floor(outerMargin)),
      maxX: Math.min(width, Math.ceil(width - outerMargin)),
      maxY: Math.min(height, Math.ceil(height - outerMargin)),
    };

    // Pass 1 (ring luma) — build a luma histogram of ring pixels so
    // we can trim away the bottom (borderLumaKeepFrac) fraction before
    // computing calibration stats. Kills shadow contamination.
    const ringLumaHist = new Uint32Array(256);
    let ringSampleCount = 0;
    for (let y = outer.minY; y < outer.maxY; y++) {
      const insideDeadY = y >= dead.minY && y < dead.maxY;
      for (let x = outer.minX; x < outer.maxX; x++) {
        if (insideDeadY && x >= dead.minX && x < dead.maxX) continue;
        ringLumaHist[luma[y * width + x]]++;
        ringSampleCount++;
      }
    }

    if (ringSampleCount >= params.borderMinSamples) {
      // Luma cutoff at the (1 - keepFrac) percentile from the BOTTOM,
      // i.e. keep the top `keepFrac` brightest pixels. Walk the hist
      // from 255 down accumulating counts until we cover keepFrac.
      const keepTarget = Math.max(
        1,
        Math.floor(ringSampleCount * params.borderLumaKeepFrac),
      );
      let accHigh = 0;
      let lumaKeepCutoff = 0;
      for (let v = 255; v >= 0; v--) {
        accHigh += ringLumaHist[v];
        if (accHigh >= keepTarget) {
          lumaKeepCutoff = v;
          break;
        }
      }

      // Pass 2 (ring, luma-trimmed) — per-channel value histograms.
      const rHist = new Uint32Array(256);
      const gHist = new Uint32Array(256);
      const bHist = new Uint32Array(256);
      let keptCount = 0;
      for (let y = outer.minY; y < outer.maxY; y++) {
        const insideDeadY = y >= dead.minY && y < dead.maxY;
        for (let x = outer.minX; x < outer.maxX; x++) {
          if (insideDeadY && x >= dead.minX && x < dead.maxX) continue;
          const i = y * width + x;
          if (luma[i] < lumaKeepCutoff) continue;
          rHist[pixels[i * 3]]++;
          gHist[pixels[i * 3 + 1]]++;
          bHist[pixels[i * 3 + 2]]++;
          keptCount++;
        }
      }

      if (keptCount >= params.borderMinSamples) {
        const medR = medianFromHist(rHist, keptCount);
        const medG = medianFromHist(gHist, keptCount);
        const medB = medianFromHist(bHist, keptCount);

        // Pass 3 (ring, luma-trimmed) — per-channel |value - median|
        // histograms → MAD as the median of those.
        const rDevHist = new Uint32Array(256);
        const gDevHist = new Uint32Array(256);
        const bDevHist = new Uint32Array(256);
        for (let y = outer.minY; y < outer.maxY; y++) {
          const insideDeadY = y >= dead.minY && y < dead.maxY;
          for (let x = outer.minX; x < outer.maxX; x++) {
            if (insideDeadY && x >= dead.minX && x < dead.maxX) continue;
            const i = y * width + x;
            if (luma[i] < lumaKeepCutoff) continue;
            rDevHist[Math.abs(pixels[i * 3] - medR)]++;
            gDevHist[Math.abs(pixels[i * 3 + 1] - medG)]++;
            bDevHist[Math.abs(pixels[i * 3 + 2] - medB)]++;
          }
        }
        const madR = medianFromHist(rDevHist, keptCount);
        const madG = medianFromHist(gDevHist, keptCount);
        const madB = medianFromHist(bDevHist, keptCount);

        const tolR = Math.max(
          params.borderMinChannelTolerance,
          params.borderChannelToleranceMultiplier * madR,
        );
        const tolG = Math.max(
          params.borderMinChannelTolerance,
          params.borderChannelToleranceMultiplier * madG,
        );
        const tolB = Math.max(
          params.borderMinChannelTolerance,
          params.borderChannelToleranceMultiplier * madB,
        );
        const chromaSpreadTol = params.borderChromaSpreadTolerance;

        // Pass 4 (whole image) — dual gate:
        //   (a) per-channel |value - median| < tolerance (luma proximity to paper)
        //   (b) paper-relative chroma-spread < tolerance (same chromaticity direction)
        // (a) alone lets warm-shifted pixels (chart body, near-white
        // value-8 chips) slip through when their per-channel deltas
        // all fit in tolR/tolG/tolB. (b) rejects those: it says the
        // pixel is only "paper" if its deviation from the paper
        // median is roughly UNIFORM across R/G/B — i.e. just brighter
        // or darker paper, not a chromatic shift. Shadowed paper
        // still passes because darkening lands equally on all channels.
        const out = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
          const r = pixels[i * 3];
          const g = pixels[i * 3 + 1];
          const b = pixels[i * 3 + 2];
          const dr = r - medR;
          const dg = g - medG;
          const db = b - medB;
          if (Math.abs(dr) >= tolR) continue;
          if (Math.abs(dg) >= tolG) continue;
          if (Math.abs(db) >= tolB) continue;
          const drg = Math.abs(dr - dg);
          const dgb = Math.abs(dg - db);
          const drb = Math.abs(dr - db);
          if (drg >= chromaSpreadTol) continue;
          if (dgb >= chromaSpreadTol) continue;
          if (drb >= chromaSpreadTol) continue;
          out[i] = 1;
        }
        return {
          mask: {width, height, pixels: out},
          lumaAnchor: anchor,
          lumaCutoff: cutoff,
          borderMedianR: medR,
          borderMedianG: medG,
          borderMedianB: medB,
          borderMadR: madR,
          borderMadG: madG,
          borderMadB: madB,
          borderSampleCount: keptCount,
          usedBorderCalibration: true,
        };
      }
    }
    // Fall through to percentile path with the ring counts captured
    // for the log. Border ring or trimmed subset was too small.
    const out = applyPercentileMask(pixels, luma, n, cutoff, params);
    return {
      mask: {width, height, pixels: out},
      lumaAnchor: anchor,
      lumaCutoff: cutoff,
      borderMedianR: null,
      borderMedianG: null,
      borderMedianB: null,
      borderMadR: null,
      borderMadG: null,
      borderMadB: null,
      borderSampleCount: ringSampleCount,
      usedBorderCalibration: false,
    };
  }

  // No guide supplied — go straight to the percentile fallback.
  const out = applyPercentileMask(pixels, luma, n, cutoff, params);
  return {
    mask: {width, height, pixels: out},
    lumaAnchor: anchor,
    lumaCutoff: cutoff,
    borderMedianR: null,
    borderMedianG: null,
    borderMedianB: null,
    borderMadR: null,
    borderMadG: null,
    borderMadB: null,
    borderSampleCount: 0,
    usedBorderCalibration: false,
  };
};

// Original luma-anchor + chroma-spread gate. Extracted so both the
// no-guide entry and the "guide supplied but too few border samples"
// fallback can share the exact same behaviour.
const applyPercentileMask = (
  pixels: Uint8Array,
  luma: Uint8Array,
  n: number,
  cutoff: number,
  params: WhiteMaskParams,
): Uint8Array => {
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
  return out;
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
// zero detections across the whole merged band.
//
// Instead of considering every hole-sized pixel individually
// (which produced 200-500K candidates on a 900x1200 preview because
// every pixel in a wide ring around the chart / tape / paper edges
// falls into the [minRadius, maxRadius] band), we downsample onto
// a coarse cell grid at half-min-radius spacing and keep the max-DT
// pixel per cell. Any legal circle (radius >= minRadius) spans
// multiple cells so this doesn't lose holes — the cell containing
// the hole's centre still surfaces it as a candidate — but drops
// the candidate count by ~cellSize² (~50x). Downstream sort +
// O(K x M) greedy overlap pruning drops correspondingly.
//
// Storage is a triple of typed arrays (candX / candY / candR) so
// the per-pixel inner loop never allocates a heap object; the
// FlatCircle[] materialisation only happens for the small kept
// set at the end.
export const findFlatCircles = (
  mask: GrayImage,
  minRadius: number,
  maxRadius: number,
): FlatCircle[] => {
  const {width, height} = mask;
  const dt = distanceTransform(mask);

  // Cell size = half min-radius (never below 4 px). Guarantees that
  // any legal circle spans at least 2 cells in each axis so we
  // never miss a hole via cell aliasing. Also caps cell count at
  // a manageable number: for a 900x1200 preview at minRadius=15,
  // cellSize=7 gives ~130x170 = 22K cells vs 1M pixels.
  const cellSize = Math.max(4, Math.floor(minRadius / 2));
  const cellCols = Math.ceil(width / cellSize);
  const cellRows = Math.ceil(height / cellSize);
  const cellCount = cellCols * cellRows;
  const candR = new Float32Array(cellCount);
  const candX = new Float32Array(cellCount);
  const candY = new Float32Array(cellCount);

  for (let y = 0; y < height; y++) {
    // eslint-disable-next-line no-bitwise -- |0 is a fast floor
    const cellY = (y / cellSize) | 0;
    const rowBase = cellY * cellCols;
    const dtRowBase = y * width;
    for (let x = 0; x < width; x++) {
      const d = dt[dtRowBase + x];
      if (d < minRadius || d > maxRadius) continue;
      // eslint-disable-next-line no-bitwise -- |0 is a fast floor
      const ci = rowBase + ((x / cellSize) | 0);
      if (d > candR[ci]) {
        candR[ci] = d;
        candX[ci] = x;
        candY[ci] = y;
      }
    }
  }

  // Compact — indices of cells with a valid candidate. Number of
  // candidates here is bounded by cellCount and typically much
  // smaller (only cells intersecting the [minRadius, maxRadius] DT
  // band get filled).
  const indices: number[] = [];
  for (let ci = 0; ci < cellCount; ci++) {
    if (candR[ci] > 0) indices.push(ci);
  }
  indices.sort((a, b) => candR[b] - candR[a]);

  // Greedy non-overlap over the (small) compact set.
  const kept: FlatCircle[] = [];
  for (const ci of indices) {
    const cx = candX[ci];
    const cy = candY[ci];
    const cr = candR[ci];
    let overlaps = false;
    for (const k of kept) {
      const dx = cx - k.cx;
      const dy = cy - k.cy;
      const sumR = cr + k.r;
      if (dx * dx + dy * dy < sumR * sumR) {
        overlaps = true;
        break;
      }
    }
    if (!overlaps) kept.push({cx, cy, r: cr});
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
