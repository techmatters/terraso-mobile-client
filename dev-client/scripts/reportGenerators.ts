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

// HTML report generator for the Munsell fixture batch runner.
//
// Emits one self-contained HTML file per run: run-level header table
// + one section per capture (metadata table + whitemask overlay SVG
// + result grid SVG). Preview images are inline as base64 data URIs.
//
// The two SVG generators here are DUPLICATES of the RN screen's
// drawing code (ResultSvg, DebugOverlayLayers in
// MunsellChartValidatorScreen.tsx). This is deliberate: the RN
// screen is destined for removal once the Node runner is the primary
// workflow, so temporary parallel code beats a shared-module
// refactor that we'd then have to unwind. Keep them roughly visually
// consistent but don't chase pixel-perfect parity.

import type {MunsellChartOutcome} from 'terraso-mobile-client/screens/MunsellChartValidator/chartAnalysis';
import type {MunsellCellResult} from 'terraso-mobile-client/screens/MunsellChartValidator/cellResults';
import {computeChartGuideRect} from 'terraso-mobile-client/screens/MunsellChartValidator/chartGuide';
import {DEFAULT_WHITE_MASK_PARAMS} from 'terraso-mobile-client/screens/MunsellChartValidator/imageOps';
import type {MunsellPage} from 'terraso-mobile-client/screens/MunsellChartValidator/munsellPages';
import {pageCells} from 'terraso-mobile-client/screens/MunsellChartValidator/munsellPages';

// ---- Types the runner passes in --------------------------------------------

export type CaptureContext = {
  // The JSON entry the runner built via buildCaptureEntry — the shape
  // reader will actually see in the exported .json file. Reused here
  // for metadata display (page, ref card, illuminant, tags) and for
  // per-cell result rendering.
  jsonEntry: CaptureJsonEntry;
  // Full analysis outcome — used for the whitemask overlay's grid
  // diagnostics (blob rings, matched-grid dots, chart-guide rect,
  // etc.) which are richer than what lands in the JSON.
  outcome: MunsellChartOutcome;
  // Page geometry — needed for the result-grid layout.
  page: MunsellPage;
  // Chosen WB reference for this capture (Munsell notation). Drives
  // the "which cell is the WB anchor" indicator in the result grid.
  referenceNotation: string;
  // Preview JPEG bytes (base64-encoded here) + display dims. May be
  // undefined when the analyzer failed and no preview was generated.
  previewImage?: {
    base64: string;
    ext: 'jpg' | 'png';
    // Dims of the JPEG itself (usually smaller than the analysis
    // preview coord space — the SVG viewBox uses preview coord dims
    // and stretches the image to fit).
    encodedWidth: number;
    encodedHeight: number;
    // The analysis coord space — same one the sample rects and grid
    // positions live in. SVG viewBox uses this so overlays land in
    // the right spot regardless of what the JPEG size happens to be.
    coordWidth: number;
    coordHeight: number;
  };
};

// Shape of the JSON entry the runner produces. Kept in sync with
// buildCaptureEntry in analyze-fixtures.ts by convention (both fields
// added / removed together). The generator only reaches for the
// fields it needs; extras are ignored.
export type CaptureJsonEntry = {
  capture_id: string;
  label: string;
  source_path: string;
  page: string;
  capture_format: 'raw' | 'photo';
  reference_card: string | null;
  environment: {illuminant_tag: string | null; tags: string[]};
  registration: Record<string, unknown>;
  wb_correction: {
    mode: string;
    reference: string;
    source?: 'auto' | 'ref_card' | 'explicit';
  } | null;
  ref_card: {
    name: string | null;
    display_name: string | null;
    sample_rect: {x: number; y: number; w: number; h: number};
    raw_linear_rgb: [number, number, number];
    // Median-cut dominant reducer companion. Same units as
    // raw_linear_rgb; null when the fixture path can't produce one
    // (photo-file fixtures, or paper synthesised from grid stats).
    raw_linear_rgb_dominant?: [number, number, number] | null;
    expected_linear_rgb: [number, number, number] | null;
    measured_linear_rgb: [number, number, number] | null;
    delta_e: number | null;
  } | null;
  // Multi-mode fixtures have all three cards taped alongside; each
  // one appears as its own entry in this array (same shape as
  // ref_card). Null for single-card fixtures.
  ref_cards?: Array<{
    name: string;
    display_name: string;
    sample_rect: {x: number; y: number; w: number; h: number};
    raw_linear_rgb: [number, number, number];
    raw_linear_rgb_dominant?: [number, number, number] | null;
    expected_linear_rgb: [number, number, number] | null;
    measured_linear_rgb: [number, number, number] | null;
    delta_e: number | null;
  }> | null;
  // exiftool-derived camera + DNG-tag summary (see analyze-fixtures
  // extractImageMetadata for exact fields). Null when the prefetch
  // failed for this fixture.
  image_metadata?: {
    make: string | null;
    model: string | null;
    unique_camera_model: string | null;
    iso: number | null;
    exposure_time: string | null;
    f_number: number | null;
    orientation: string | null;
    white_balance: string | null;
    color_space: string | null;
    bits_per_sample: number | null;
    black_level: number[] | null;
    white_level: number | null;
    as_shot_neutral: number[] | null;
    color_matrix_1: number[] | null;
    color_matrix_2: number[] | null;
    calibration_illuminant_1: string | null;
    calibration_illuminant_2: string | null;
    dng_version: string | null;
  } | null;
  cells: CellJsonEntry[];
};

export type CellJsonEntry = {
  physical_row: number;
  physical_col: number;
  expected_notation: string;
  measured_notation: string;
  expected_linear_rgb: [number, number, number];
  raw_linear_rgb: [number, number, number];
  // Median-cut dominant reducer companion (see analyzer + filmstrip
  // reducer radio). Null on photo-path fixtures.
  raw_linear_rgb_dominant?: [number, number, number] | null;
  measured_linear_rgb: [number, number, number];
  delta_e: number;
  sample_rect: {x: number; y: number; w: number; h: number};
  is_reference: boolean;
};

// ---- Utilities -------------------------------------------------------------

const esc = (s: string | number): string =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const linearToHex = (rgb: readonly [number, number, number]): string => {
  // Gamma-encode linear → sRGB display for on-screen colour. Chart
  // pipeline stores linear values; the browser expects display-encoded.
  const enc = (v: number): number => {
    const c = Math.max(0, Math.min(1, v));
    const g = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    return Math.round(g * 255);
  };
  const h = (n: number): string => n.toString(16).padStart(2, '0');
  return `#${h(enc(rgb[0]))}${h(enc(rgb[1]))}${h(enc(rgb[2]))}`;
};

const deltaEColor = (deltaE: number): string => {
  if (deltaE < 3) return '#c8f5c8';
  if (deltaE < 6) return '#e6f5c8';
  if (deltaE < 12) return '#f5e6c8';
  return '#f5c8c8';
};

// ---- Lab + ΔE2000 breakdown --------------------------------------------
// Standalone implementations so renderResultCell can compute per-cell
// L / C / h contributions to the total ΔE without touching the RN
// colour modules. Numerically compatible with the analyzer's
// linearRgbToXyz + xyzToLab + delta-e npm package to within display
// precision.
const _labE = 216 / 24389;
const _labK = 24389 / 27;
const _labF = (t: number): number =>
  t > _labE ? Math.cbrt(t) : (_labK * t + 16) / 116;
export const rgbToLab = (rgb: readonly [number, number, number]): [number, number, number] => {
  const [r, g, b] = rgb;
  const X = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const Y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
  const Z = 0.0193339 * r + 0.1191920 * g + 0.9503041 * b;
  const fx = _labF(X / 0.95047);
  const fy = _labF(Y / 1.0);
  const fz = _labF(Z / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};
// CIE ΔE2000, Sharma 2005 formulation. Returns total AND per-term
// contributions so the hover tooltip can attribute "how much of the
// error was lightness vs chroma vs hue." Sub-terms are the SQUARED
// weighted diffs (so lTerm² + cTerm² + hTerm² + cross ≈ total²) —
// yields intuitive percentage contributions.
type DeltaEBreakdown = {
  total: number;
  dL: number; // signed L2-L1 (before weighting)
  dC: number; // signed C'2-C'1 (before weighting)
  dh: number; // signed hue diff in degrees (before H'/2 chord thing)
  lTerm: number; // (ΔL' / S_L)² — squared lightness contribution
  cTerm: number; // (ΔC' / S_C)² — squared chroma contribution
  hTerm: number; // (ΔH' / S_H)² — squared hue contribution
  cross: number; // R_T · (ΔC'/S_C) · (ΔH'/S_H) — cross-term (signed)
};
export const deltaE2000Breakdown = (
  labA: readonly [number, number, number],
  labB: readonly [number, number, number],
): DeltaEBreakdown => {
  const [L1, a1, b1] = labA;
  const [L2, a2, b2] = labB;
  const C1s = Math.sqrt(a1 * a1 + b1 * b1);
  const C2s = Math.sqrt(a2 * a2 + b2 * b2);
  const Cbar = (C1s + C2s) / 2;
  const Cbar7 = Math.pow(Cbar, 7);
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + Math.pow(25, 7))));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);
  const h1p = (Math.atan2(b1, a1p) * 180 / Math.PI + 360) % 360;
  const h2p = (Math.atan2(b2, a2p) * 180 / Math.PI + 360) % 360;
  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp;
  if (C1p * C2p === 0) dhp = 0;
  else if (Math.abs(h2p - h1p) <= 180) dhp = h2p - h1p;
  else if (h2p - h1p > 180) dhp = h2p - h1p - 360;
  else dhp = h2p - h1p + 360;
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp * Math.PI / 180) / 2);
  const Lbar = (L1 + L2) / 2;
  const Cbarp = (C1p + C2p) / 2;
  let hbarp;
  if (C1p * C2p === 0) hbarp = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180) hbarp = (h1p + h2p) / 2;
  else if (h1p + h2p < 360) hbarp = (h1p + h2p + 360) / 2;
  else hbarp = (h1p + h2p - 360) / 2;
  const T = 1
    - 0.17 * Math.cos((hbarp - 30) * Math.PI / 180)
    + 0.24 * Math.cos((2 * hbarp) * Math.PI / 180)
    + 0.32 * Math.cos((3 * hbarp + 6) * Math.PI / 180)
    - 0.20 * Math.cos((4 * hbarp - 63) * Math.PI / 180);
  const dTh = 30 * Math.exp(-Math.pow((hbarp - 275) / 25, 2));
  const RC = 2 * Math.sqrt(Math.pow(Cbarp, 7) / (Math.pow(Cbarp, 7) + Math.pow(25, 7)));
  const SL = 1 + (0.015 * Math.pow(Lbar - 50, 2)) / Math.sqrt(20 + Math.pow(Lbar - 50, 2));
  const SC = 1 + 0.045 * Cbarp;
  const SH = 1 + 0.015 * Cbarp * T;
  const RT = -Math.sin(2 * dTh * Math.PI / 180) * RC;
  const wL = dLp / SL;
  const wC = dCp / SC;
  const wH = dHp / SH;
  const cross = RT * wC * wH;
  const total = Math.sqrt(wL * wL + wC * wC + wH * wH + cross);
  return {
    total,
    dL: dLp,
    dC: dCp,
    dh: dhp,
    lTerm: wL * wL,
    cTerm: wC * wC,
    hTerm: wH * wH,
    cross,
  };
};

// Poor-man's SVG text wrap. Assumes ~0.55×font-size per average
// character (sane for sans-serif); splits on whitespace and packs
// words until the next word would overflow. No hyphenation — a single
// word longer than the box lives on its own line and overflows. Good
// enough for the REF card's card-name field.
const wrapText = (
  text: string,
  maxWidthPx: number,
  fontSize: number,
): string[] => {
  const maxChars = Math.max(1, Math.floor(maxWidthPx / (fontSize * 0.55)));
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? cur + ' ' + w : w;
    if (next.length <= maxChars) {
      cur = next;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
};

// ---- Whitemask overlay SVG -------------------------------------------------

// Preview image + white diagonal-hash annulus (whitemask border-cal
// sample area) + yellow-dashed chart guide rect + green rings on
// kept circles + yellow rings on matched-ref grid (filled if inlier)
// + red rings on winning triplet + red rects on sample positions
// + red rect on ref-card position.
// Skipped (add later if useful): whitemask blue span overlay,
// chart-body cyan outline.
// Small bar chart used under the whitemask to visualise per-column
// and per-row mean brightness across matched-grid inliers. Bars fill
// bottom-up (col chart) or left-to-right (row chart) — a lit-from-
// one-side capture is instantly visible as a tilt in either bar.
const renderBrightnessBarChart = (
  values: readonly (number | null)[],
  orientation: 'horizontal' | 'vertical',
  label: string,
): string => {
  if (values.length === 0) return '';
  const WIDTH = 260;
  const HEIGHT = 90;
  const PAD_L = 32;
  const PAD_R = 8;
  const PAD_T = 16;
  const PAD_B = 22;
  const plotW = WIDTH - PAD_L - PAD_R;
  const plotH = HEIGHT - PAD_T - PAD_B;
  // Fixed y-scale [80, 220] — brightness range that covers virtually
  // all captures without truncating.
  const Y_MIN = 80;
  const Y_MAX = 220;
  const yFor = (v: number): number =>
    PAD_T + plotH * (1 - (v - Y_MIN) / (Y_MAX - Y_MIN));
  const parts: string[] = [];
  parts.push(
    `<rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="#fff" stroke="#ddd"/>`,
  );
  // Gridlines at 100/150/200.
  for (const g of [100, 150, 200]) {
    const gy = yFor(g);
    parts.push(
      `<line x1="${PAD_L}" y1="${gy}" x2="${WIDTH - PAD_R}" y2="${gy}" stroke="#eee"/>`,
    );
    parts.push(
      `<text x="${PAD_L - 2}" y="${gy + 3}" font-size="9" fill="#888" text-anchor="end">${g}</text>`,
    );
  }
  const barW = plotW / values.length;
  values.forEach((v, i) => {
    if (v === null) return;
    const bx = PAD_L + i * barW + 1;
    const bw = barW - 2;
    const by = yFor(v);
    const bh = HEIGHT - PAD_B - by;
    parts.push(
      `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="#3388cc"/>`,
    );
    parts.push(
      `<text x="${bx + bw / 2}" y="${HEIGHT - PAD_B + 12}" font-size="9" fill="#666" text-anchor="middle">${i}</text>`,
    );
    parts.push(
      `<text x="${bx + bw / 2}" y="${by - 2}" font-size="9" fill="#333" text-anchor="middle">${Math.round(v)}</text>`,
    );
  });
  parts.push(
    `<text x="${WIDTH / 2}" y="12" font-size="11" font-weight="bold" fill="#444" text-anchor="middle">${esc(label)}</text>`,
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">${parts.join('')}</svg>`;
};

export const renderWhitemaskOverlaySvg = (cap: CaptureContext): string => {
  if (!cap.previewImage) {
    return '<div class="no-preview">(no preview available — analysis failed before preview render)</div>';
  }
  const {
    base64,
    ext,
    coordWidth: W,
    coordHeight: H,
  } = cap.previewImage;
  // Overlays draw from EITHER outcome.result.grid (success) OR
  // outcome.debug.grid (failure / registered). Same shape, so the
  // downstream drawing code is identical. `result` is the full
  // MunsellChartResult (only set on success) — some layers use its
  // extra fields (previewRects, refCardRect, multiRefCards) that
  // debug.grid doesn't have.
  const grid =
    cap.outcome.kind === 'success'
      ? cap.outcome.result.grid
      : cap.outcome.kind === 'failure' || cap.outcome.kind === 'registered'
        ? cap.outcome.debug.grid
        : null;
  const result =
    cap.outcome.kind === 'success' ? cap.outcome.result : null;
  const parts: string[] = [];
  parts.push(
    `<image href="data:image/${ext};base64,${base64}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none"/>`,
  );

  // Whitemask spans — the pixels the border-cal classifier labelled
  // "paper" (or "background color"). On bright-paper captures this
  // covers the surroundings + paper-visible-through-hole regions; on
  // dark-paper it covers only the dark surroundings. Drawn as
  // semi-transparent blue so the preview stays visible underneath.
  // Wrapped in a <g class="layer-mask"> group so the report's per-
  // capture "show mask" toggle can hide/show it via CSS.
  if (grid && grid.brightMaskSpans.length > 0) {
    parts.push('<g class="layer-mask">');
    for (const s of grid.brightMaskSpans) {
      // +1 on height to hide sub-pixel AA seams between adjacent
      // row-stride tiles (matches the on-screen mask rendering).
      parts.push(
        `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h + 1}" fill="rgba(0,180,255,0.55)"/>`,
      );
    }
    parts.push('</g>');
  }

  // Chart guide rectangle — where the on-screen framing guide sits in
  // preview-image coordinates. Same math as the RN debug overlay.
  const guideRect = computeChartGuideRect(W, H);

  // White diagonal-hash annulus over the WhiteMask border-calibration
  // sample area (outer = image minus outerMargin, inner = guide plus
  // innerBuf). Uses an SVG <pattern> with an explicit slanted line
  // (three overlapping segments so the diagonal is continuous across
  // pattern tile edges). Part of the mask-layer group so it hides in
  // the "Original" and "+ Registration" view modes.
  // When borderExcludeRightSide is on, shrink the outer's right edge
  // to the inner's right edge so the hash covers only top / left /
  // bottom — matches what whiteMask actually samples now that the
  // ref-card slab on the right is excluded.
  const shortDim = Math.min(W, H);
  const innerBuf =
    shortDim * DEFAULT_WHITE_MASK_PARAMS.borderInnerBufferFrac;
  const outerMargin =
    shortDim * DEFAULT_WHITE_MASK_PARAMS.borderOuterMarginFrac;
  const innerX = guideRect.x - innerBuf;
  const innerY = guideRect.y - innerBuf;
  const innerW = guideRect.w + 2 * innerBuf;
  const innerH = guideRect.h + 2 * innerBuf;
  const outerX = outerMargin;
  const outerY = outerMargin;
  const outerRightEdge = DEFAULT_WHITE_MASK_PARAMS.borderExcludeRightSide
    ? innerX + innerW
    : W - outerMargin;
  const outerW = outerRightEdge - outerX;
  const outerH = H - 2 * outerMargin;
  const annulusPath =
    `M${outerX},${outerY} h${outerW} v${outerH} h${-outerW} Z ` +
    `M${innerX},${innerY} h${innerW} v${innerH} h${-innerW} Z`;
  const patternId = `whitemaskHash-${cap.jsonEntry.capture_id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  parts.push(
    `<defs><pattern id="${patternId}" patternUnits="userSpaceOnUse" width="16" height="16">` +
      `<line x1="0" y1="16" x2="16" y2="0" stroke="white" stroke-width="3"/>` +
      `<line x1="-4" y1="4" x2="4" y2="-4" stroke="white" stroke-width="3"/>` +
      `<line x1="12" y1="20" x2="20" y2="12" stroke="white" stroke-width="3"/>` +
      `</pattern></defs>`,
  );
  parts.push(
    `<g class="layer-mask">` +
      `<path d="${annulusPath}" fill="url(#${patternId})" fill-rule="evenodd"/>` +
      `</g>`,
  );

  // Yellow dashed chart guide rectangle — where the tester was framing
  // the chart in the viewfinder. Always shown (all overlay modes) so
  // the tester can see "where the card should be" even on the raw
  // "Original" view. Wrapped in its own group anyway for future
  // toggling.
  parts.push('<g class="layer-guide">');
  parts.push(
    `<rect x="${guideRect.x}" y="${guideRect.y}" width="${guideRect.w}" height="${guideRect.h}" stroke="#ffeb3b" stroke-width="2" stroke-dasharray="8,6" fill="none"/>`,
  );
  parts.push('</g>');

  // Registration overlays: drawn from `grid` (available on both
  // success + failure/registered), plus a few success-only layers
  // (previewRects, refCardRect, multiRefCards from `result`).
  if (grid) {
    parts.push('<g class="layer-registration">');

    // Magenta boxes for REJECTED candidates — makes visible which
    // blobs the classifier tossed and why. Same color for all reject
    // statuses; hover over the source JSON if you need to know which
    // reject bucket a specific box came from.
    for (const b of grid.rawBlobs) {
      if (b.status === 'kept') continue;
      const w = b.maxX - b.minX + 1;
      const h = b.maxY - b.minY + 1;
      parts.push(
        `<rect x="${b.minX}" y="${b.minY}" width="${w}" height="${h}" stroke="#cc00cc" stroke-width="1" fill="none"/>`,
      );
    }

    // Green rings on detected/kept circles + centre dots.
    for (const b of grid.rawBlobs) {
      if (b.status !== 'kept') continue;
      const r = (b.maxX - b.minX) / 2;
      parts.push(
        `<circle cx="${b.cx}" cy="${b.cy}" r="${r}" stroke="#22cc22" stroke-width="2" fill="none"/>`,
      );
      parts.push(
        `<rect x="${b.cx - 3}" y="${b.cy - 3}" width="6" height="6" fill="#22cc22"/>`,
      );
    }

    // Yellow rings on matched-ref grid — filled when inlier.
    // Immediately below each ring, a small text with the grayscale
    // brightness sampled from the preview at that point — makes it
    // trivial to see "hollow ring at (x,y) has brightness 145, below
    // paper midpoint 182 → rejected by classifier".
    if (grid.matchedGrid) {
      grid.matchedGrid.forEach((p, i) => {
        const fill = grid.matchedGridInliers?.[i] ? '#ffcc00' : 'none';
        parts.push(
          `<circle cx="${p.x}" cy="${p.y}" r="14" stroke="#ffcc00" stroke-width="3" fill="${fill}"/>`,
        );
        const b = grid.matchedGridBrightness?.[i];
        if (b !== undefined) {
          parts.push(
            `<text x="${p.x}" y="${p.y + 26}" text-anchor="middle" font-family="sans-serif" font-size="11" font-weight="bold" fill="#ffcc00" stroke="black" stroke-width="0.4" paint-order="stroke">${b}</text>`,
          );
        }
      });
    }

    // Red rings on the winning triplet detected points.
    if (grid.matchedTripletDetected) {
      for (const p of grid.matchedTripletDetected) {
        parts.push(
          `<circle cx="${p.x}" cy="${p.y}" r="22" stroke="#ff2020" stroke-width="3" fill="none"/>`,
        );
      }
    }

    if (result) {
      // Red rects on per-cell sample positions.
      for (const r of result.previewRects) {
        parts.push(
          `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" stroke="#ff2020" stroke-width="2" fill="none"/>`,
        );
      }

      // Ref-card sample rect (same red as chip rects). Skipped in
      // multi mode — the 3 cyan multiRefCards rects below already
      // show every ref-card position, so the legacy single-slot
      // refCardRect just adds a mystery red square at an empty
      // chart-body position.
      const refRect = result.refCardRect;
      if (refRect && !result.multiRefCards) {
        parts.push(
          `<rect x="${refRect.x}" y="${refRect.y}" width="${refRect.w}" height="${refRect.h}" stroke="#ff2020" stroke-width="2" fill="none"/>`,
        );
      }

      // Multi-mode: 3 extra rects for the taped whibal/postit/greycard
      // slots. Cyan outline + a small text label so they visually
      // distinguish from chip/ref-card rects. Absent for single-card
      // fixtures.
      const multi = result.multiRefCards;
      if (multi) {
        for (const slot of multi) {
          const {x, y, w, h} = slot.rect;
          parts.push(
            `<rect x="${x}" y="${y}" width="${w}" height="${h}" ` +
              `stroke="#00c8d0" stroke-width="2" fill="none"/>`,
          );
          parts.push(
            `<text x="${x + w + 4}" y="${y + h / 2 + 4}" ` +
              `font-family="sans-serif" font-size="14" ` +
              `fill="#00c8d0" stroke="#003b40" stroke-width="0.5">` +
              `${esc(slot.name)}</text>`,
          );
        }
      }
    }

    parts.push('</g>');
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="whitemask-svg">${parts.join('')}</svg>`;
};

// ---- Result grid SVG -------------------------------------------------------

// Simple projection: rows = data-space rows (indexed 0..nRows-1),
// cols = data-space cols. Each cell shows expected/measured swatches
// and text. Empty grid slots (physical position with no cell) render
// as a light-gray placeholder. REF row below the grid.
export const renderResultGridSvg = (
  cap: CaptureContext,
  excludedSet: Set<string> = new Set(),
): string => {
  const {page, jsonEntry, referenceNotation} = cap;
  const layout = page.layout ?? 'standard';
  const firstCol = page.firstChipCol ?? 0;
  const firstRow = page.firstChipRow ?? 0;
  const nRows = page.chipsPerRow.length;
  const nDataCols =
    layout === 'white' ? page.values.length : page.chromas.length;

  const CELL_W = 105;
  const CELL_H = 100;
  const CELL_GAP = 6; // horizontal + vertical breathing room between cells
  const LABEL_W = 90;
  const WB_BANNER_H = 30; // caption band above column headers
  const HEADER_H = 36;
  const REF_ROW_H = CELL_H;
  const SVG_W = LABEL_W + CELL_W * nDataCols;
  const SVG_H =
    WB_BANNER_H + HEADER_H + CELL_H * nRows + REF_ROW_H + 20;

  const rowLabelFor = (r: number): string => {
    if (layout === 'white') {
      const rl = page.rowLabels?.[r];
      return rl ? (rl.chroma === 0 ? rl.hue : `${rl.hue} /${rl.chroma}`) : '';
    }
    const v = page.values[r];
    return v === undefined ? '' : String(v);
  };
  const colLabelFor = (c: number): string => {
    if (layout === 'white') {
      const v = page.values[c];
      return v === undefined ? '' : String(v);
    }
    const ch = page.chromas[c];
    const h = page.columnHues?.[c];
    return h ? `${h} /${ch}` : String(ch);
  };

  // Build a physical-position → cell result lookup. The Node runner
  // paired cells 1-to-1 with pageCells(page), so we can rebuild
  // MunsellCellResult by pulling from jsonEntry.cells.
  const byKey = new Map<string, CellJsonEntry>();
  for (const c of jsonEntry.cells) {
    byKey.set(`r${c.physical_row}c${c.physical_col}`, c);
  }

  const el: string[] = [];

  // Background.
  el.push(
    `<rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="white"/>`,
  );

  // WB anchor banner at the top — always visible so the reader knows
  // which cell / card was used for WB correction. Text tunes to the
  // anchor source: ref_card means the physical card sampled in the
  // shot (highlighted in the REF row); auto/explicit means a chart
  // chip (highlighted in the main grid, or noted as absent).
  const wbSource = jsonEntry.wb_correction?.source;
  const refOnPage = jsonEntry.cells.some(
    c => c.expected_notation === referenceNotation,
  );
  let wbNote: string;
  let wbActive: boolean;
  if (wbSource === 'ref_card') {
    wbNote = '— physical card (red-bordered in REF row below)';
    wbActive = true;
  } else if (refOnPage) {
    wbNote = '— red-bordered below';
    wbActive = true;
  } else {
    wbNote = '— not on this page (no WB correction applied)';
    wbActive = false;
  }
  el.push(
    `<text x="10" y="20" font-family="sans-serif" font-size="14" font-weight="bold" fill="${wbActive ? '#c62828' : '#666'}">WB anchor: ${esc(referenceNotation)} <tspan font-weight="normal" fill="#666">${esc(wbNote)}</tspan></text>`,
  );

  // Column headers.
  for (let dc = 0; dc < nDataCols; dc++) {
    const x = LABEL_W + CELL_W * dc + CELL_W / 2;
    el.push(
      `<text x="${x}" y="${WB_BANNER_H + HEADER_H - 10}" text-anchor="middle" font-family="sans-serif" font-size="18" font-weight="bold">${esc(colLabelFor(dc))}</text>`,
    );
  }

  // Row headers + cells.
  for (let dr = 0; dr < nRows; dr++) {
    const physicalRow = firstRow + dr;
    const y = WB_BANNER_H + HEADER_H + CELL_H * dr;
    el.push(
      `<text x="${LABEL_W - 10}" y="${y + CELL_H / 2 + 6}" text-anchor="end" font-family="sans-serif" font-size="18" font-weight="bold">${esc(rowLabelFor(dr))}</text>`,
    );

    for (let dc = 0; dc < nDataCols; dc++) {
      const x = LABEL_W + CELL_W * dc;
      const key = `r${physicalRow}c${firstCol + dc}`;
      const cell = byKey.get(key);
      if (!cell) {
        el.push(
          `<rect x="${x + CELL_GAP / 2}" y="${y + CELL_GAP / 2}" width="${CELL_W - CELL_GAP}" height="${CELL_H - CELL_GAP}" fill="#f0f0f0" stroke="#dddddd" stroke-width="1"/>`,
        );
        continue;
      }
      el.push(
        renderResultCell(
          x + CELL_GAP / 2,
          y + CELL_GAP / 2,
          CELL_W - CELL_GAP,
          CELL_H - CELL_GAP,
          cell,
          referenceNotation,
          excludedSet,
        ),
      );
    }
  }

  // REF row below the grid. Two modes:
  //   - multi capture (jsonEntry.ref_cards populated): one cell per
  //     slot (whibal / postit / greycard / ...), each highlighted with
  //     the red anchor border when the current WB anchor matches
  //     "ref_card:{slot}".
  //   - single-card capture (jsonEntry.ref_card populated): one cell
  //     using the physical card's data, red-bordered when wbSource
  //     === 'ref_card'.
  // The multi block takes precedence so the "multi" placeholder in
  // ref_card (empty measured/expected, always grey) isn't shown when
  // richer per-slot data is available.
  const refY = WB_BANNER_H + HEADER_H + CELL_H * nRows;
  const wbRef = jsonEntry.wb_correction?.reference ?? '';
  const wbAnchorSlot = wbRef.startsWith('ref_card:')
    ? wbRef.slice('ref_card:'.length)
    : null;
  if (jsonEntry.ref_cards && jsonEntry.ref_cards.length > 0) {
    el.push(
      `<text x="${LABEL_W - 10}" y="${refY + REF_ROW_H / 2 + 6}" text-anchor="end" font-family="sans-serif" font-size="18" font-weight="bold">REF</text>`,
    );
    jsonEntry.ref_cards.forEach((slot, i) => {
      const cellX = LABEL_W + CELL_W * i + CELL_GAP / 2;
      el.push(
        renderRefCardCell(
          cellX,
          refY + CELL_GAP / 2,
          CELL_W - CELL_GAP,
          REF_ROW_H - CELL_GAP,
          slot,
          wbAnchorSlot === slot.name,
        ),
      );
    });
  } else if (jsonEntry.ref_card) {
    el.push(
      `<text x="${LABEL_W - 10}" y="${refY + REF_ROW_H / 2 + 6}" text-anchor="end" font-family="sans-serif" font-size="18" font-weight="bold">REF</text>`,
    );
    el.push(
      renderRefCardCell(
        LABEL_W + CELL_GAP / 2,
        refY + CELL_GAP / 2,
        CELL_W - CELL_GAP,
        REF_ROW_H - CELL_GAP,
        jsonEntry.ref_card,
        wbSource === 'ref_card',
      ),
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_W} ${SVG_H}" class="results-svg">${el.join('')}</svg>`;
};

const renderResultCell = (
  x: number,
  y: number,
  w: number,
  h: number,
  cell: CellJsonEntry,
  referenceNotation: string,
  excludedSet: Set<string> = new Set(),
): string => {
  const bg = deltaEColor(cell.delta_e);
  const expHex = linearToHex(cell.expected_linear_rgb);
  const measHex = linearToHex(cell.measured_linear_rgb);
  const swatchH = h * 0.4;
  const swatchW = (w - 6) / 2;
  const textY = y + swatchH + 8;
  const isRef = cell.expected_notation === referenceNotation;
  const isExcluded = excludedSet.has(cell.expected_notation);
  const parts = [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${bg}"/>`,
    `<rect x="${x + 2}" y="${y + 2}" width="${swatchW}" height="${swatchH}" fill="${expHex}"/>`,
    `<rect x="${x + 4 + swatchW}" y="${y + 2}" width="${swatchW}" height="${swatchH}" fill="${measHex}"/>`,
    `<text x="${x + w / 2}" y="${textY + 13}" text-anchor="middle" font-family="sans-serif" font-size="12">${esc(cell.expected_notation)}</text>`,
    `<text x="${x + w / 2}" y="${textY + 27}" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#444">${esc(cell.measured_notation)}</text>`,
    `<text x="${x + w / 2}" y="${textY + 45}" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold">ΔE ${cell.delta_e.toFixed(1)}</text>`,
  ];
  if (isRef) {
    // Thick red outline marks the WB anchor cell.
    parts.push(
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#ff2020" stroke-width="4"/>`,
    );
  }
  if (isExcluded) {
    // Thick red diagonal strike marks chips flagged as physically
    // defective (see scripts/excluded-chips.json). Drawn on top of
    // everything so it's visible against dark bg fills; two lines for
    // better legibility.
    parts.push(
      `<line x1="${x}" y1="${y}" x2="${x + w}" y2="${y + h}" ` +
        `stroke="#ff2020" stroke-width="3" opacity="0.85"/>`,
      `<line x1="${x + w}" y1="${y}" x2="${x}" y2="${y + h}" ` +
        `stroke="#ff2020" stroke-width="3" opacity="0.85"/>`,
    );
  }
  // Native SVG <title> — browser shows on hover after ~1s delay.
  // Breaks the ΔE2000 total into lightness / chroma / hue / cross
  // contributions with signed raw diffs so a reader can attribute
  // where the miss came from (e.g. "80% chroma, chip is under-
  // saturated by 4 units").
  const labExp = rgbToLab(cell.expected_linear_rgb);
  const labMea = rgbToLab(cell.measured_linear_rgb);
  const bd = deltaE2000Breakdown(labExp, labMea);
  const t2 = bd.total * bd.total;
  const pct = (v: number) => (t2 > 0 ? Math.round((v / t2) * 100) : 0);
  const titleText =
    `${cell.expected_notation} → ${cell.measured_notation}\n` +
    `ΔE₀₀ total: ${bd.total.toFixed(2)}\n` +
    `  from lightness (L): ${Math.sqrt(bd.lTerm).toFixed(2)}  (${pct(bd.lTerm)}%)\n` +
    `  from chroma (C):    ${Math.sqrt(bd.cTerm).toFixed(2)}  (${pct(bd.cTerm)}%)\n` +
    `  from hue (H):       ${Math.sqrt(bd.hTerm).toFixed(2)}  (${pct(bd.hTerm)}%)\n` +
    (Math.abs(bd.cross) > 0.05
      ? `  blue-region cross: ${bd.cross >= 0 ? '+' : ''}${bd.cross.toFixed(2)}\n`
      : '') +
    `\nSigned diffs (measured − expected):\n` +
    `  ΔL* = ${bd.dL >= 0 ? '+' : ''}${bd.dL.toFixed(1)}  ` +
      `(${bd.dL >= 0 ? 'lighter' : 'darker'})\n` +
    `  ΔC* = ${bd.dC >= 0 ? '+' : ''}${bd.dC.toFixed(1)}  ` +
      `(${bd.dC >= 0 ? 'more chromatic' : 'more neutral'})\n` +
    `  Δh  = ${bd.dh >= 0 ? '+' : ''}${bd.dh.toFixed(1)}°`;
  return `<g><title>${esc(titleText)}</title>${parts.join('')}</g>`;
};

// Same visual layout as renderResultCell (background coloured by ΔE,
// expected swatch left half, measured swatch right half, name below,
// ΔE at the bottom) — just uses the display name instead of a Munsell
// notation and doesn't render a measured-notation line. Falls back
// gracefully when expected/measured/ΔE aren't populated (older schema
// or unknown card name).
const renderRefCardCell = (
  x: number,
  y: number,
  w: number,
  h: number,
  refCard: NonNullable<CaptureJsonEntry['ref_card']>,
  isAnchor: boolean,
): string => {
  const hasFullData =
    refCard.expected_linear_rgb !== null &&
    refCard.measured_linear_rgb !== null &&
    refCard.delta_e !== null;
  const bg = hasFullData ? deltaEColor(refCard.delta_e!) : '#eaeaea';
  const expHex = hasFullData
    ? linearToHex(refCard.expected_linear_rgb!)
    : '#eaeaea';
  const measHex = linearToHex(
    refCard.measured_linear_rgb ?? refCard.raw_linear_rgb,
  );
  const swatchH = h * 0.35;
  const swatchW = (w - 6) / 2;
  const nameFontSize = 11;
  const nameLineH = nameFontSize + 2;
  const nameLines = wrapText(
    refCard.display_name ?? refCard.name ?? '(unnamed)',
    w - 8,
    nameFontSize,
  );
  const textY = y + swatchH + 6;
  const parts = [
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${bg}"/>`,
    `<rect x="${x + 2}" y="${y + 2}" width="${swatchW}" height="${swatchH}" fill="${expHex}"/>`,
    `<rect x="${x + 4 + swatchW}" y="${y + 2}" width="${swatchW}" height="${swatchH}" fill="${measHex}"/>`,
  ];
  nameLines.forEach((line, i) => {
    parts.push(
      `<text x="${x + w / 2}" y="${textY + nameFontSize + i * nameLineH}" text-anchor="middle" font-family="sans-serif" font-size="${nameFontSize}">${esc(line)}</text>`,
    );
  });
  if (hasFullData) {
    // Sit ΔE the same distance below the last name line as it does in
    // renderResultCell (~18px baseline-to-baseline). No extra buffer.
    const lastNameY = textY + nameFontSize + (nameLines.length - 1) * nameLineH;
    parts.push(
      `<text x="${x + w / 2}" y="${lastNameY + 18}" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold">ΔE ${refCard.delta_e!.toFixed(1)}</text>`,
    );
  }
  if (isAnchor) {
    parts.push(
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#ff2020" stroke-width="4"/>`,
    );
  }
  return parts.join('');
};

// ---- HTML report -----------------------------------------------------------

export type RunMeta = {
  schema_version: string;
  generated_at: string;
  fixtures_root: string;
  n_fixtures: number;
  n_success: number;
  n_failure: number;
  // Munsell notations flagged as physically defective (loaded from
  // scripts/excluded-chips.json). Rendered as red diagonal strikes in
  // the results grid; filmstrip has a checkbox to filter them out.
  excluded_chips: string[];
  // Fixture labels flagged as bad (poor registration, mis-framed
  // shot, etc.). Greycard ranking table renders them with
  // strikethrough; filmstrip has a default-on checkbox to filter
  // them out. Loaded from scripts/excluded-cards.json.
  excluded_cards: string[];
};

export const renderHtmlReport = (
  meta: RunMeta,
  captures: CaptureContext[],
): string => {
  // Group by fixture stem (source_path minus extension). Multiple
  // captures per fixture arise when the runner sweeps several WB
  // anchors OR when a chart-capture pair produced both a DNG and a
  // sibling JPEG for the same shutter. Rendering once per stem keeps
  // the report readable: one metadata table + N result grids
  // side-by-side (WB anchors × formats).
  const stripExt = (p: string): string => {
    const dot = p.lastIndexOf('.');
    const slash = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
    return dot > slash ? p.slice(0, dot) : p;
  };
  const groups = new Map<string, CaptureContext[]>();
  for (const c of captures) {
    const key = stripExt(c.jsonEntry.source_path);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  const groupList = Array.from(groups.values());
  const excludedSet = new Set(meta.excluded_chips ?? []);
  const sections = groupList
    .map(g => renderFixtureSection(g, excludedSet))
    .join('\n');
  const toc = renderToc(groupList);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Munsell Chart Validator report — ${esc(meta.generated_at)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif; margin: 24px; color: #222; }
    h1 { margin: 0 0 4px 0; font-size: 22px; }
    h2 { font-size: 18px; margin: 24px 0 8px 0; }
    h3 { font-size: 14px; margin: 0 0 6px 0; color: #555; }
    table.meta { border-collapse: collapse; margin: 12px 0; font-size: 13px; }
    table.meta th, table.meta td { border: 1px solid #ddd; padding: 4px 10px; text-align: left; vertical-align: top; }
    table.meta th { background: #f7f7f7; font-weight: 600; white-space: nowrap; }
    section.capture { border: 1px solid #ccc; padding: 12px 18px; margin: 12px 0; border-radius: 6px; background: #fafafa; }
    section.capture.failed { background: #fff5f5; border-color: #f5c8c8; }
    /* Whitemask sits on its own row (full width) so it can render as
       large as the browser will allow; result grids wrap below in a
       flex row. */
    .whitemask-block { flex: 1 1 100%; }
    .results-block { flex: 1 1 100%; }
    /* CSS grid keeps every variant tile the same width regardless of
       how many land on the final row — flex-wrap would balloon the
       leftovers to fill remaining space. auto-fill picks as many
       340px+ columns as fit; minmax stretches them to equal 1fr. */
    .results-variants { display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 16px; align-items: start; }
    .results-variants > div { min-width: 0; }
    .format-header { margin: 20px 0 6px 0; font-size: 15px;
      font-weight: 700; letter-spacing: 0.05em; color: #333;
      text-transform: uppercase; padding-bottom: 4px;
      border-bottom: 2px solid #ccc; }
    .format-header .fmt-badge { display: inline-block;
      padding: 2px 10px; border-radius: 3px; margin-right: 8px;
      font-size: 13px; }
    .format-header.raw   .fmt-badge { background: #e8f0ff; color: #244; }
    .format-header.photo .fmt-badge { background: #fff4e8; color: #542; }
    .images { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }
    svg.whitemask-svg { width: 100%; height: auto; max-width: 1400px; background: #000; }
    svg.results-svg { width: 100%; height: auto; max-width: 800px; }
    .no-preview { padding: 20px; background: #eee; color: #666; font-style: italic; }
    code { font-family: ui-monospace, SFMono-Regular, monospace; font-size: 12px; }
    .variant-label { font-size: 13px; color: #444; margin: 0 0 4px 0; }
    .legend { border: 1px solid #ddd; padding: 12px 18px; margin: 12px 0 24px 0;
              border-radius: 6px; background: #f9f9f9; }
    .legend-flex { display: flex; flex-wrap: wrap; gap: 24px; align-items: flex-start; }
    .legend-flex ul { margin: 4px 0; padding-left: 20px; font-size: 13px; }
    .legend-flex li { margin: 2px 0; }
    .buckets { display: flex; gap: 6px; margin-top: 8px; font-size: 12px; }
    .buckets span { display: inline-block; padding: 4px 10px; border: 1px solid #ccc; }
    .reg-table table { border-collapse: collapse; font-size: 13px; margin: 8px 0; }
    .reg-table th, .reg-table td { border: 1px solid #ddd; padding: 3px 10px; text-align: left; }
    .reg-table th { background: #f7f7f7; font-weight: 600; }
    .reg-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
    .reg-good { background: #c8f5c8; }
    .reg-warn { background: #f5e6c8; }
    .reg-bad { background: #f5c8c8; }
    /* Per-fixture preview controls + panel visibility.
       data-fmt on the container drives which panel is visible;
       data-mode drives which SVG layer groups are hidden. */
    .preview-controls { margin: 6px 0 8px 0; font-size: 13px; color: #444;
                        display: flex; flex-wrap: wrap; gap: 4px 12px;
                        align-items: center; }
    .preview-controls .control-label { font-weight: 600; margin-right: 2px; }
    .preview-controls .control-sep { color: #bbb; margin: 0 4px; }
    .preview-controls label { cursor: pointer; user-select: none; }
    .preview-controls input[type=radio] { margin-right: 3px; vertical-align: -1px; }
    .preview-container .preview-panel { display: none; }
    .preview-container[data-fmt=raw]   .preview-panel[data-fmt=raw]   { display: block; }
    .preview-container[data-fmt=photo] .preview-panel[data-fmt=photo] { display: block; }
    /* Mode: original hides registration + mask; +registration hides
       only mask; +mask shows everything. Guide is always shown. */
    .preview-container[data-mode=original]     .layer-registration { display: none; }
    .preview-container[data-mode=original]     .layer-mask         { display: none; }
    .preview-container[data-mode=registration] .layer-mask         { display: none; }
  </style>
</head>
<body>
  <h1>Munsell Chart Validator — regression report</h1>
  <table class="meta">
    <tr><th>Schema version</th><td>${esc(meta.schema_version)}</td></tr>
    <tr><th>Generated</th><td>${esc(meta.generated_at)}</td></tr>
    <tr><th>Fixtures root</th><td><code>${esc(meta.fixtures_root)}</code></td></tr>
    <tr><th>Fixtures</th><td>${meta.n_fixtures} (${meta.n_success} ok, ${meta.n_failure} failed)</td></tr>
    <tr><th>Captures</th><td>${captures.length}</td></tr>
  </table>
  ${renderGreycardRanking(captures, new Set(meta.excluded_cards ?? []))}
  ${renderRegistrationTable(groupList)}
  ${toc}
  ${renderLegend()}
  ${sections}
  <script>
    // Per-fixture preview toggles. Each .preview-controls wraps two
    // radio groups (format + mode); on change, the sibling
    // .preview-container's data-fmt / data-mode attributes update,
    // which CSS then uses to show/hide the right panel and layer
    // groups. Single delegated handler at document level so the
    // number of listeners stays O(1) regardless of fixture count.
    document.addEventListener('change', function (e) {
      var target = e.target;
      if (!target || !target.name) return;
      var isFmt = target.name.indexOf('fmt-') === 0;
      var isMode = target.name.indexOf('mode-') === 0;
      if (!isFmt && !isMode) return;
      var controls = target.closest('.preview-controls');
      if (!controls) return;
      var container = controls.parentElement.querySelector('.preview-container');
      if (!container) return;
      if (isFmt) container.dataset.fmt = target.value;
      if (isMode) container.dataset.mode = target.value;
    });
  </script>
</body>
</html>
`;
};

// Greycard-anchored fixture ranking. One row per (fixture stem,
// capture format) whose WB anchor was the greycard ref card, so raw
// + photo of the same shutter get separate rows (the ΔE distribution
// is often very different between pipelines). Sorted ascending on
// WORST ΔE — the worst cell tends to be the best signal for "is this
// capture broken vs just noisy": one bad chip is usually a broken
// registration or lighting issue, whereas mean can hide that under
// good cells. Registration columns beside ΔE let the eye correlate
// low inlier ratios / high miss counts with poor ΔE.
const renderGreycardRanking = (
  captures: CaptureContext[],
  excludedCards: Set<string> = new Set(),
): string => {
  const isGreycard = (c: CaptureContext) =>
    c.jsonEntry.wb_correction?.reference === 'ref_card:greycard';
  const rows = captures
    .filter(isGreycard)
    .map(c => {
      const cells = c.jsonEntry.cells ?? [];
      const des = cells
        .map(x => x.delta_e)
        .filter((x): x is number => typeof x === 'number');
      if (des.length === 0) return null;
      const mean = des.reduce((a, b) => a + b, 0) / des.length;
      const worst = Math.max(...des);
      const reg = c.jsonEntry.registration as {
        match_total?: number | null;
        inliers?: number | null;
      };
      const total = reg?.match_total ?? 0;
      const inl = reg?.inliers ?? 0;
      const inlierRatio = total > 0 ? inl / total : null;
      const missesRatio = total > 0 ? (total - inl) / total : null;
      // Signal strength — min(R,G,B) of greycard raw. Catches the
      // "one channel starved" case that dim-shot filtering can miss.
      // Since the row is already greycard-anchored, ref_cards is
      // guaranteed to have a greycard entry.
      const gc = (c.jsonEntry.ref_cards ?? []).find(r => r.name === 'greycard');
      const signal = gc?.raw_linear_rgb
        ? Math.min(gc.raw_linear_rgb[0], gc.raw_linear_rgb[1], gc.raw_linear_rgb[2])
        : null;
      return {
        label: c.jsonEntry.label,
        format: c.jsonEntry.capture_format,
        mean,
        worst,
        n: des.length,
        inliers: inl,
        matchTotal: total,
        inlierRatio,
        missesRatio,
        signal,
        sectionId: fixtureSectionId(c.jsonEntry.label),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
  if (rows.length === 0) return '';
  // Sort by worst ΔE descending? Or ascending? User wants best→worst
  // i.e. small worst-ΔE first. Ascending on worst.
  rows.sort((a, b) => a.worst - b.worst);

  // Two colour classifiers reused across cells. deClass tuned for the
  // ΔE scale (green ≤ 6, red > 12); ratioClass for [0,1] fractions
  // where "high inliers" and "low misses" are both good.
  const deClass = (v: number) => {
    if (v <= 6) return 'reg-good';
    if (v > 12) return 'reg-bad';
    return '';
  };
  const inlierClass = (v: number | null) => {
    if (v == null) return 'reg-bad';
    if (v >= 0.9) return 'reg-good';
    if (v < 0.7) return 'reg-bad';
    return '';
  };
  const missClass = (v: number | null) => {
    if (v == null) return 'reg-bad';
    if (v <= 0.1) return 'reg-good';
    if (v > 0.3) return 'reg-bad';
    return '';
  };
  // Signal thresholds: greycard's nominal reflectance is 0.18, so a
  // well-lit shot reads ≈ 0.15+ across every channel; < 0.08 lands
  // in the "one channel starved" territory that produces the
  // per-chip jumpiness we've been chasing.
  const signalClass = (v: number | null) => {
    if (v == null) return 'reg-bad';
    if (v >= 0.15) return 'reg-good';
    if (v < 0.08) return 'reg-bad';
    return '';
  };
  const fmtRatio = (v: number | null) =>
    v == null ? '—' : (100 * v).toFixed(0) + '%';

  const trs = rows
    .map((r, i) => {
      const isExcluded = excludedCards.has(r.label);
      // Strikethrough via row-level style so every cell strikes,
      // plus muted opacity so the eye reads it as "not counted."
      // Row still clickable so the user can jump to the section
      // and eyeball what got excluded and why.
      const rowStyle = isExcluded
        ? ' style="text-decoration: line-through; opacity: 0.45;"'
        : '';
      const exclTag = isExcluded
        ? ' <span style="text-decoration:none;font-size:10px;color:#c62828;font-weight:600;" title="in excluded-cards.json">(EXCLUDED)</span>'
        : '';
      return (
        `<tr${rowStyle}>` +
        `<td class="num">${i + 1}</td>` +
        `<td><a href="#${r.sectionId}">${esc(r.label)}</a> ` +
        `<span style="color:#888">(${esc(r.format)})</span>${exclTag}</td>` +
        `<td class="num ${deClass(r.mean)}">${r.mean.toFixed(2)}</td>` +
        `<td class="num ${deClass(r.worst)}">${r.worst.toFixed(2)}</td>` +
        `<td class="num">${r.n}</td>` +
        `<td class="num ${inlierClass(r.inlierRatio)}">${fmtRatio(r.inlierRatio)}` +
          ` <span style="color:#888;font-size:11px">(${r.inliers}/${r.matchTotal})</span></td>` +
        `<td class="num ${missClass(r.missesRatio)}">${fmtRatio(r.missesRatio)}` +
          ` <span style="color:#888;font-size:11px">(${r.matchTotal - r.inliers}/${r.matchTotal})</span></td>` +
        `<td class="num ${signalClass(r.signal)}">${r.signal == null ? '—' : r.signal.toFixed(3)}</td>` +
        `</tr>`
      );
    })
    .join('');
  return `
  <h2 id="greycard-ranking" style="margin-top:24px">Greycard ranking — sorted by worst ΔE (best → worst)</h2>
  <p style="font-size:12px;color:#666;margin:4px 0 8px">
    Only captures whose WB anchor was <code>ref_card:greycard</code>.
    Raw + photo of the same shutter get separate rows so pipeline-specific
    problems don't average away. Sorted by <b>worst</b> per-cell ΔE — one
    bad chip is often a broken registration or an over-exposed chip, more
    diagnostic than the mean. Registration columns let you correlate low
    inlier ratios / high misses with bad ΔE. Click a fixture to jump to
    its section.
  </p>
  <table class="reg-table"><thead><tr>
    <th>#</th><th>Fixture</th>
    <th>mean ΔE</th><th>worst ΔE</th><th>n cells</th>
    <th>inliers</th><th>misses</th>
    <th title="min(R,G,B) of greycard raw — proxy for sensor signal strength on the weakest channel">signal</th>
  </tr></thead><tbody>${trs}</tbody></table>`;
};

// Temporary diagnostic: one row per fixture with the registration
// ratio (inliers/total) and absolute miss count, colour-coded so
// problem fixtures pop out at a glance. Sorted alphabetically to
// match the TOC / file browser ordering. Remove when the underlying
// registration quality is consistently green.
const renderRegistrationTable = (groups: CaptureContext[][]): string => {
  type Row = {
    label: string;
    ratio: number;
    misses: number;
    total: number;
    inliers: number;
    paperGap: number | null;
    direction: string | null;
    unevenness: number | null;
    hOffset: number | null;
    vOffset: number | null;
    valid: boolean;
  };
  const rows: Row[] = groups.map(g => {
    const first = g[0];
    const reg = first.jsonEntry.registration as {
      mode?: string;
      match_total?: number | null;
      inliers?: number | null;
      paper_gap?: number | null;
      direction?: string | null;
      illumination?: {unevenness?: number} | null;
      max_h_offset_frac?: number | null;
      max_v_offset_frac?: number | null;
    };
    const total = reg.match_total ?? 0;
    const inl = reg.inliers ?? 0;
    return {
      label: first.jsonEntry.label,
      ratio: total > 0 ? inl / total : 0,
      misses: total - inl,
      total,
      inliers: inl,
      paperGap: reg.paper_gap ?? null,
      direction: reg.direction ?? null,
      unevenness: reg.illumination?.unevenness ?? null,
      hOffset: reg.max_h_offset_frac ?? null,
      vOffset: reg.max_v_offset_frac ?? null,
      valid: reg.mode === 'auto',
    };
  });
  rows.sort((a, b) => a.label.localeCompare(b.label));

  const ratioClass = (r: number, valid: boolean): string => {
    if (!valid) return 'reg-bad';
    if (r >= 0.9) return 'reg-good';
    if (r < 0.7) return 'reg-bad';
    return '';
  };
  const missesClass = (m: number, valid: boolean): string => {
    if (!valid) return 'reg-bad';
    if (m === 0) return 'reg-good';
    if (m > 10) return 'reg-bad';
    if (m > 2) return 'reg-warn';
    return '';
  };
  // Gap correlation from the diagnostic run: >=50 → always perfect,
  // <30 → nearly always poor, 30-50 → mixed.
  const gapClass = (g: number | null): string => {
    if (g === null) return '';
    if (g >= 50) return 'reg-good';
    if (g < 30) return 'reg-bad';
    return 'reg-warn';
  };
  // Illumination unevenness (max of col_range, row_range across
  // inlier chip brightness). <20 = even, >40 = clearly uneven.
  const unevennessClass = (u: number | null): string => {
    if (u === null) return '';
    if (u < 20) return 'reg-good';
    if (u > 40) return 'reg-bad';
    return 'reg-warn';
  };
  // Guide-alignment offsets. Provisional thresholds until we look at
  // the distribution — 0.5 cell-step feels like a natural yellow, 1.0
  // is a whole cell-step off and definitely wrong.
  const offsetClass = (o: number | null): string => {
    if (o === null) return '';
    if (o < 0.5) return 'reg-good';
    if (o >= 0.75) return 'reg-bad';
    return 'reg-warn';
  };

  const trs = rows
    .map(r => {
      const ratioText = r.valid ? r.ratio.toFixed(2) : 'FAIL';
      const missesText = r.valid ? `${r.misses} / ${r.total}` : '—';
      const gapText =
        r.paperGap === null ? '—' : `${r.paperGap.toFixed(0)}`;
      const dirText = r.direction === 'fallback' ? '' : r.direction ?? '';
      const unevenText =
        r.unevenness === null ? '—' : r.unevenness.toFixed(0);
      const hOffText =
        r.hOffset === null ? '—' : r.hOffset.toFixed(2);
      const vOffText =
        r.vOffset === null ? '—' : r.vOffset.toFixed(2);
      return `
      <tr>
        <td><a href="#${fixtureSectionId(r.label)}">${esc(r.label)}</a></td>
        <td class="num ${ratioClass(r.ratio, r.valid)}">${ratioText}</td>
        <td class="num ${missesClass(r.misses, r.valid)}">${missesText}</td>
        <td class="num ${gapClass(r.paperGap)}">${gapText}</td>
        <td class="num ${unevennessClass(r.unevenness)}">${unevenText}</td>
        <td class="num ${offsetClass(r.hOffset)}">${hOffText}</td>
        <td class="num ${offsetClass(r.vOffset)}">${vOffText}</td>
        <td>${esc(dirText)}</td>
      </tr>`;
    })
    .join('');

  return `
<section class="reg-table">
  <h2 style="margin-top:0">Registration quality (temporary)</h2>
  <p style="font-size:12px; color:#666; margin:4px 0 8px 0">
    Colours — ratio: <span class="reg-good" style="padding:1px 6px">&ge;0.90</span>
    <span class="reg-bad" style="padding:1px 6px">&lt;0.70</span>;
    misses: <span class="reg-good" style="padding:1px 6px">0</span>
    <span class="reg-warn" style="padding:1px 6px">&gt;2</span>
    <span class="reg-bad" style="padding:1px 6px">&gt;10</span>;
    paper gap: <span class="reg-good" style="padding:1px 6px">&ge;50</span>
    <span class="reg-warn" style="padding:1px 6px">30-49</span>
    <span class="reg-bad" style="padding:1px 6px">&lt;30</span>;
    illum unevenness: <span class="reg-good" style="padding:1px 6px">&lt;20</span>
    <span class="reg-warn" style="padding:1px 6px">20-40</span>
    <span class="reg-bad" style="padding:1px 6px">&gt;40</span>;
    h/v offset: <span class="reg-good" style="padding:1px 6px">&lt;0.50</span>
    <span class="reg-warn" style="padding:1px 6px">0.50-0.74</span>
    <span class="reg-bad" style="padding:1px 6px">&ge;0.75</span> (of a cell-step).
  </p>
  <table>
    <thead><tr>
      <th>Fixture</th>
      <th>inliers / total (ratio)</th>
      <th>misses / total</th>
      <th>paper gap</th>
      <th>illum unevenness</th>
      <th>h offset</th>
      <th>v offset</th>
      <th>direction</th>
    </tr></thead>
    <tbody>${trs}
    </tbody>
  </table>
</section>`;
};

// Section anchor id, derived from fixture label. Reused by the TOC's
// links and by the fixture <section id="...">.
const fixtureSectionId = (label: string): string =>
  `fixture-${label.replace(/[^A-Za-z0-9_-]/g, '_')}`;

// Two-level TOC: page → fixture. Each page block groups the fixtures
// captured against it; each fixture line links to its section.
const renderToc = (groups: CaptureContext[][]): string => {
  const byPage = new Map<string, CaptureContext[][]>();
  for (const g of groups) {
    const page = g[0].jsonEntry.page;
    if (!byPage.has(page)) byPage.set(page, []);
    byPage.get(page)!.push(g);
  }
  const pageBlocks = Array.from(byPage.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([page, pageGroups]) => {
      const items = pageGroups
        .map(g => {
          const label = g[0].jsonEntry.label;
          return `      <li><a href="#${fixtureSectionId(label)}">${esc(label)}</a></li>`;
        })
        .join('\n');
      return `  <li><strong>${esc(page)}</strong>\n    <ul>\n${items}\n    </ul>\n  </li>`;
    })
    .join('\n');
  return `
<nav class="toc">
  <h2 style="margin-top:0">Fixtures</h2>
  <ul>
${pageBlocks}
  </ul>
</nav>`;
};

// Cell-layout + ΔE-bucket explainer shown once at the top of the
// report. Mirrors the legend the RN screen puts above its result grid
// so readers new to the format can decode a cell without needing to
// find external docs.
const renderLegend = (): string => {
  // Sample cell — same layout as renderResultCell, at fixed dims.
  const SW = 130;
  const SH = 100;
  const sample = renderResultCell(
    0,
    0,
    SW,
    SH,
    {
      physical_row: 0,
      physical_col: 0,
      expected_notation: '10YR 5/4',
      measured_notation: '10YR 5/3',
      expected_linear_rgb: [0.28, 0.23, 0.13],
      raw_linear_rgb: [0.28, 0.23, 0.13],
      measured_linear_rgb: [0.28, 0.22, 0.14],
      delta_e: 4.2,
      sample_rect: {x: 0, y: 0, w: 0, h: 0},
      is_reference: false,
    },
    '',
  );
  return `
<section class="legend">
  <h2 style="margin-top:0">How to read each cell</h2>
  <div class="legend-flex">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SW} ${SH}" width="${SW}" height="${SH}" style="border:1px solid #ccc">${sample}</svg>
    <ul>
      <li><strong>Left swatch:</strong> expected colour (Munsell reference)</li>
      <li><strong>Right swatch:</strong> measured colour (from the DNG, after WB correction)</li>
      <li><strong>Line 1:</strong> expected Munsell notation</li>
      <li><strong>Line 2:</strong> measured Munsell notation</li>
      <li><strong>ΔE</strong> (CIE ΔE2000): 0 = perfect, ≈ 1 = just noticeable, ≥ 12 = clearly off</li>
      <li><strong>Cell background:</strong> ΔE bucket colour (see below)</li>
      <li><strong>Red border:</strong> the cell (or REF card) being used as the WB anchor</li>
    </ul>
  </div>
  <div class="buckets">
    <span style="background:${deltaEColor(1)}">ΔE &le; 3</span>
    <span style="background:${deltaEColor(4)}">ΔE &le; 6</span>
    <span style="background:${deltaEColor(8)}">ΔE &le; 12</span>
    <span style="background:${deltaEColor(20)}">ΔE &gt; 12</span>
  </div>
</section>`;
};

// Multi-mode fixtures have a ref_cards[] block with per-slot ΔE
// values that change with the WB anchor. Render a compact table row
// listing each slot's ΔE across variants — quick visual on how well
// each card matches its expected linear-sRGB under each WB anchor.
// Returns empty string for single-card fixtures (no ref_cards block).
// Compact per-fixture EXIF / DNG-tag summary. Groups fields into a
// shot-settings line + a DNG-color-pipeline line (only when a DNG
// variant is present). Nothing rendered when metadata isn't available
// (e.g. exiftool prefetch failed for the run).
const renderImageMetadataRow = (variants: CaptureContext[]): string => {
  const meta = variants.find(v => v.jsonEntry.image_metadata)?.jsonEntry
    .image_metadata;
  if (!meta) return '';
  const fmt = (arr: number[] | null, digits: number) =>
    arr ? '[' + arr.map(v => v.toFixed(digits)).join(', ') + ']' : null;
  const shot = [
    meta.model ? `<b>${esc(meta.model)}</b>` : null,
    meta.iso != null ? `ISO ${meta.iso}` : null,
    meta.exposure_time ? `${esc(meta.exposure_time)} s` : null,
    meta.f_number != null ? `f/${meta.f_number}` : null,
    meta.white_balance ? `WB=${esc(meta.white_balance)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const dng = [
    meta.bits_per_sample != null ? `${meta.bits_per_sample}-bit` : null,
    fmt(meta.black_level, 2) != null ? `black=${fmt(meta.black_level, 2)}` : null,
    meta.white_level != null ? `white=${meta.white_level}` : null,
    fmt(meta.as_shot_neutral, 3) != null
      ? `asShotNeutral=${fmt(meta.as_shot_neutral, 3)}`
      : null,
    meta.calibration_illuminant_2
      ? `illum2=${esc(meta.calibration_illuminant_2)}`
      : null,
    meta.dng_version ? `DNG ${esc(meta.dng_version)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const rows = [
    shot
      ? `<tr><th>Shot</th><td style="font-size:12px">${shot}</td></tr>`
      : '',
    dng
      ? `<tr><th>DNG color</th><td style="font-size:12px;font-family:ui-monospace,monospace">${dng}</td></tr>`
      : '',
  ]
    .filter(Boolean)
    .join('');
  return rows;
};

const renderMultiRefRow = (variants: CaptureContext[]): string => {
  const anyMulti = variants.some(v => v.jsonEntry.ref_cards);
  if (!anyMulti) return '';
  const rows = variants
    .filter(v => v.jsonEntry.ref_cards)
    .map(v => {
      const wb = v.jsonEntry.wb_correction?.reference ?? '(none)';
      const fmt = v.jsonEntry.capture_format;
      const cells = (v.jsonEntry.ref_cards ?? [])
        .map(
          c =>
            `<code>${esc(c.name)}: ${
              c.delta_e != null ? c.delta_e.toFixed(1) : 'n/a'
            }</code>`,
        )
        .join(' &nbsp; ');
      return `<div>${esc(fmt)} / ${esc(wb)}: ${cells}</div>`;
    })
    .join('');
  return `<tr><th>Multi refs ΔE</th><td>${rows}</td></tr>`;
};

const renderFixtureSection = (
  variants: CaptureContext[],
  excludedSet: Set<string>,
): string => {
  // A section groups every capture that shares a source-path stem —
  // so a DNG + its JPEG sibling for the same shutter land here
  // together, potentially alongside multiple WB-anchor sweeps of
  // each. Sort so raw comes before photo, and within each format
  // the natural anchor ordering is preserved.
  const sorted = [...variants].sort((a, b) => {
    const af = a.jsonEntry.capture_format;
    const bf = b.jsonEntry.capture_format;
    if (af !== bf) return af === 'raw' ? -1 : 1;
    return 0;
  });
  // One variant per format is enough for the whitemask display — all
  // variants of the same format share the same preview image + grid
  // (only the WB anchor differs between them).
  const formatAnchors = new Map<'raw' | 'photo', CaptureContext>();
  for (const v of sorted) {
    const f = v.jsonEntry.capture_format;
    if (!formatAnchors.has(f)) formatAnchors.set(f, v);
  }
  const formatList = Array.from(formatAnchors.keys());
  const initialFmt = formatList[0];
  // "Anchor" for legacy blocks (metadata table, ref-card row, etc.)
  // — always the first sorted variant (raw when present).
  const anchor = sorted[0];
  const {jsonEntry} = anchor;
  const isFailed = sorted.every(v => v.outcome.kind === 'failure');
  const reg = jsonEntry.registration;
  const regRows = Object.entries(reg)
    .map(
      ([k, v]) =>
        `<tr><th>${esc(k)}</th><td><code>${esc(JSON.stringify(v))}</code></td></tr>`,
    )
    .join('');
  const formats = Array.from(
    new Set(sorted.map(v => v.jsonEntry.capture_format)),
  ).join(', ');
  const wbLabels = sorted
    .map(v => {
      const wb = v.jsonEntry.wb_correction?.reference ?? '(none)';
      return `${v.jsonEntry.capture_format}:${wb}`;
    })
    .join(' | ');
  // Group variants by capture format so raw and photo get their own
  // labelled block and don't share a row. Each block uses a CSS grid
  // with fixed-width columns so tile size stays consistent regardless
  // of how many variants that format has.
  const renderVariantTile = (v: CaptureContext): string => {
    const label = v.jsonEntry.wb_correction?.reference ?? '(no WB)';
    const source = v.jsonEntry.wb_correction?.source ?? '';
    const fmt = v.jsonEntry.capture_format;
    const fmtBadge =
      `<span style="background:${fmt === 'raw' ? '#e8f0ff' : '#fff4e8'};` +
      `border:1px solid #ccc;padding:1px 6px;border-radius:3px;` +
      `font-size:11px;color:#555;margin-right:6px;">${esc(fmt)}</span>`;
    return `
      <div>
        <p class="variant-label">${fmtBadge}<strong>${esc(label)}</strong> <span style="color:#888">(${esc(source)})</span></p>
        ${renderResultGridSvg(v, excludedSet)}
      </div>`;
  };
  const fmtGroups: {fmt: 'raw' | 'photo'; label: string; items: CaptureContext[]}[] = [];
  for (const fmt of ['raw', 'photo'] as const) {
    const items = sorted.filter(v => v.jsonEntry.capture_format === fmt);
    if (items.length === 0) continue;
    fmtGroups.push({
      fmt,
      label: fmt === 'raw' ? 'RAW (DNG)' : 'JPEG (photo)',
      items,
    });
  }
  const resultBlocks = fmtGroups
    .map(g =>
      `<h3 class="format-header ${g.fmt}">` +
        `<span class="fmt-badge">${esc(g.fmt)}</span>${esc(g.label)}` +
        ` <span style="font-size:11px;color:#888;font-weight:400;text-transform:none;">` +
        `(${g.items.length} WB variant${g.items.length === 1 ? '' : 's'})</span>` +
      `</h3>` +
      `<div class="results-variants">${g.items.map(renderVariantTile).join('')}</div>`,
    )
    .join('');
  const idBase = fixtureSectionId(jsonEntry.label);
  const showFmtToggle = formatList.length > 1;

  // Per-fixture controls: format switch (raw vs jpg) + overlay-mode
  // switch (original / +registration / +mask). See CSS at the top of
  // the report — data-fmt + data-mode on the preview-container drive
  // the visibility of layer groups and per-format panels.
  const fmtLabelFor = (f: string) => (f === 'raw' ? 'RAW (DNG)' : 'JPEG');
  const controlsHtml = `
    <div class="preview-controls" data-id="${idBase}">
      ${
        showFmtToggle
          ? `<span class="control-label">Format:</span>
             ${formatList
               .map(
                 f => `<label><input type="radio" name="fmt-${idBase}" value="${f}" ${
                   f === initialFmt ? 'checked' : ''
                 }> ${fmtLabelFor(f)}</label>`,
               )
               .join(' ')} <span class="control-sep">·</span> `
          : ''
      }
      <span class="control-label">Overlay:</span>
      <label><input type="radio" name="mode-${idBase}" value="original"> Original</label>
      <label><input type="radio" name="mode-${idBase}" value="registration" checked> + Registration</label>
      <label><input type="radio" name="mode-${idBase}" value="mask"> + Registration + Mask (blue)</label>
    </div>`;

  const panelsHtml = formatList
    .map(fmt => {
      const capForFmt = formatAnchors.get(fmt)!;
      return `<div class="preview-panel" data-fmt="${fmt}">${renderWhitemaskOverlaySvg(capForFmt)}</div>`;
    })
    .join('');

  return `
<section class="capture ${isFailed ? 'failed' : 'ok'}" id="${idBase}">
  <h2>${esc(jsonEntry.label)}${isFailed ? ' <span style="color:#c62828">[FAILED]</span>' : ''}</h2>
  <table class="meta">
    <tr><th>Page</th><td>${esc(jsonEntry.page)}</td></tr>
    <tr><th>Formats</th><td>${esc(formats)}</td></tr>
    <tr><th>Reference card</th><td>${esc(jsonEntry.reference_card ?? '(none)')}</td></tr>
    <tr><th>Illuminant</th><td>${esc(jsonEntry.environment.illuminant_tag ?? '(none)')}</td></tr>
    <tr><th>Tags</th><td>${esc(jsonEntry.environment.tags.join(', ') || '(none)')}</td></tr>
    <tr><th>Variants</th><td>${esc(wbLabels)}</td></tr>
    ${renderMultiRefRow(sorted)}
    ${renderImageMetadataRow(sorted)}
    ${regRows}
    <tr><th>Source</th><td><code>${esc(jsonEntry.source_path)}</code></td></tr>
  </table>
  <div class="images">
    <div class="whitemask-block">
      <h3>Preview + overlays</h3>
      ${controlsHtml}
      <div class="preview-container" data-id="${idBase}" data-fmt="${initialFmt ?? ''}" data-mode="registration">
        ${panelsHtml}
      </div>
      ${renderIlluminationBlock(anchor)}
    </div>
    ${
      isFailed
        ? ''
        : `<div class="results-block">
      <h3>Result grids (per format × WB anchor)</h3>
      ${resultBlocks}
    </div>`
    }
  </div>
</section>`;
};

// Pulls the illumination stats out of the fixture's registration
// block and renders two small brightness bar charts + a one-line
// "unevenness = N" summary. Silent when illumination is absent
// (RANSAC didn't lock, so no matched-grid brightness data).
const renderIlluminationBlock = (cap: CaptureContext): string => {
  const illum = (cap.jsonEntry.registration as {illumination?: unknown})
    .illumination as {
    column_means: (number | null)[];
    row_means: (number | null)[];
    column_range: number;
    row_range: number;
    unevenness: number;
    n_inliers: number;
  } | null | undefined;
  if (!illum) return '';
  const uCls =
    illum.unevenness < 20
      ? 'reg-good'
      : illum.unevenness > 40
        ? 'reg-bad'
        : 'reg-warn';
  return `
<div style="margin-top:8px">
  <h3 style="margin:6px 0">Illumination evenness</h3>
  <p style="font-size:12px; color:#444; margin:4px 0">
    unevenness = <span class="${uCls}" style="padding:2px 8px; font-weight:bold">${illum.unevenness.toFixed(1)}</span>
    · column range = ${illum.column_range.toFixed(1)}
    · row range = ${illum.row_range.toFixed(1)}
    · n_inliers = ${illum.n_inliers}
  </p>
  <div style="display:flex; gap:16px; flex-wrap:wrap">
    ${renderBrightnessBarChart(illum.column_means, 'vertical', 'Per-column mean (physical col →)')}
    ${renderBrightnessBarChart(illum.row_means, 'vertical', 'Per-row mean (physical row →)')}
  </div>
</div>`;
};

// Local re-export so the runner can pull one type from here without
// importing pageCells directly (which it already does elsewhere).
export {pageCells};
