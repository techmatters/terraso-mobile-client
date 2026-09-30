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

// Munsell error-filmstrip generator. Reads a JSON export from
// analyze-fixtures, bakes the samples + the ~440-chip ground-truth
// lattice into a self-contained HTML page, and emits an interactive
// visualization: one polar disk per ground-truth Munsell value,
// facet-filtered by ref card / background / page. WB-source
// filtering is exposed via the ref-card selector's 'self' and
// 'card' pseudo-options.
//
// All rendering happens in the browser so filter changes are live.
// This script's whole job is to marshal the two data blobs and embed
// them in the HTML template.
//
// Munsell notation is coordinate-native — angle = hue, radius = chroma,
// so the plot geometry is pure arithmetic on the notation strings and
// needs no color-science library. Chip lattice fill colors come from
// `pageCells(page).expectedLinearRgb`, which the `munsell` npm library
// computes with chromatic adaptation from Illuminant C (Munsell's
// reference) to sRGB D65 (display's) — safe for on-screen chip fills.
// The Illuminant-C caveat from the notes matters when computing
// numeric error metrics, not when painting chip backdrops.
//
// Run:
//   npm run render-munsell-error
//     [--json <path>]  default ./results/html-report-run.json
//     [--out  <path>]  default ./results/munsell-error.html

import * as fs from 'fs';
import * as path from 'path';
import {parseArgs} from 'util';

import {
  MUNSELL_PAGES,
  pageCells,
} from 'terraso-mobile-client/screens/MunsellChartValidator/munsellPages';

// ---- Args ------------------------------------------------------------------

const {values} = parseArgs({
  options: {
    json: {type: 'string'},
    out: {type: 'string'},
  },
});

const jsonPath = values.json ?? './results/html-report-run.json';
const outPath = values.out ?? './results/munsell-error.html';

// ---- Sample extraction -----------------------------------------------------

type Sample = {
  expected: string;
  page: string;
  tags: string[];
  fixtureLabel: string;
  // 'raw' (DNG → CIRAWFilter) or 'photo' (JPEG → CIImage). Since
  // each shot captures both, the filmstrip filters on this field
  // to compare pipelines head-to-head.
  format: 'raw' | 'photo';
  device: string;
  bg: string;
  // Copied from the parent capture's registration.illumination.
  // Null when RANSAC didn't lock (no illumination stats available).
  illumUnevenness: number | null;
  // Ground-truth chip colour (D65 linear-sRGB) and the sensor's
  // pre-WB read of this cell. WB is applied client-side per render
  // using the user-picked reference cards, so we no longer carry
  // the analyzer's baked-in measured_linear_rgb / measured_notation
  // / delta_e — they'd be inconsistent with a live WB choice.
  expectedRgb: [number, number, number];
  rawRgb: [number, number, number];
  // Median-cut dominant reducer companion (Phase 1). Same coord frame
  // as rawRgb; null when the analyzer couldn't produce one for this
  // sample (photo-path fixtures — CIImage can't cheaply do per-pixel
  // median-cut; also legacy runs that predate the dominant emit).
  // The 'reducer' radio flips downstream ΔE math from rawRgb to this.
  rawRgbDominant: [number, number, number] | null;
  // Physical-card measurements from THIS shutter, keyed by card
  // name ('whibal' | 'postit' | 'greycard'). Used as reference
  // points for the client-side WB fit; missing entries just mean
  // that card wasn't visible in this capture and can't be picked.
  // `rawDominant` is the per-card median-cut companion of `raw`;
  // null on photo-path fixtures + legacy runs.
  refOptions: {[name: string]: {expected: [number, number, number]; raw: [number, number, number]; rawDominant: [number, number, number] | null}};
  // Shot kind bucket, derived from the label:
  //   'burst1of5' … 'burstNofM' — individual burst frames
  //   'burstavgofN'             — the synthetic averaged capture
  //   'manual_iso100_shut33ms'  — one manual (iso, shutter) shot per row
  //   'single'                  — non-burst / non-manual (default)
  // Lets the filmstrip facet by shot type across a whole batch —
  // e.g. "does burstavg do noticeably better than a single frame?"
  captureType: string;
  // Illumination bucket, derived from the enriched-filename
  // `lightSLUG` tag (lightsun / lightshade / lightled5000k / …) OR
  // from the parent directory path (e.g. "direct sunlight" / "open
  // shade" / "cloudy"). Lets the filmstrip A/B compare light
  // conditions on the same physical chart. 'unknown' when neither
  // source yields a hit.
  illumination: string;
};

// Recognise device from either the directory path (legacy fixtures
// organised by device folder) OR the enriched-filename token (e.g.
// `pixel6a`, `pixel7`, `iphone14pro`). Path wins when both are set
// because it's the more explicit categorisation for existing batches.
const deviceOf = (p: string): string => {
  if (p.includes('iPhone')) return 'iPhone';
  if (p.includes('Pixel 4')) return 'Pixel 4';
  if (p.includes('Pixel 6a')) return 'Pixel 6a';
  if (p.includes('Pixel 7')) return 'Pixel 7';
  // Enriched-filename fallback: look for a lower-case device slug
  // in the basename. Match iphone / pixelNa / pixelN with a rough
  // pretty-print heuristic. Order matters: check the more-specific
  // `pixel6a` before the generic `pixel6`.
  const base = p.split('/').pop()?.toLowerCase() ?? '';
  const m = base.match(/(iphone[a-z0-9]*|pixel\d+[a-z]*)/);
  if (m) {
    const slug = m[1];
    if (slug.startsWith('iphone')) return 'iPhone';
    if (slug === 'pixel4') return 'Pixel 4';
    if (slug === 'pixel6a') return 'Pixel 6a';
    if (slug === 'pixel7') return 'Pixel 7';
    // Unrecognised specific model — capitalise for display but keep
    // the specifics so it's distinguishable in the device filter.
    return slug[0].toUpperCase() + slug.slice(1);
  }
  return 'other';
};
// Background derivation: legacy path convention ("LIGHT BG" / "DARK BG"
// folder) first, then enriched-filename fallback (bare `_light` / `_dark`
// tokens embedded in the basename by the MULTI session flow).
const bgOf = (p: string): string => {
  if (p.includes('LIGHT BG')) return 'light';
  if (p.includes('DARK BG')) return 'dark';
  const base = p.split('/').pop()?.toLowerCase() ?? '';
  if (base.split('_').includes('light')) return 'light';
  if (base.split('_').includes('dark')) return 'dark';
  return 'unknown';
};

// Derive the capture-type bucket from a fixture label. Matches:
//   burstavgofN     → 'burstavgofN'  (synthetic averaged burst)
//   burstNofM       → 'burstNofM'    (individual burst frame)
//   manual_isoX_shutY → 'manual_isoX_shutY'
//   anything else   → 'single'
// Case-insensitive on the pattern names; keeps whatever iso/shut
// values the label actually carries so parameter variants stay
// distinct (e.g. iso100_shut33ms vs iso100_shut67ms).
const captureTypeOf = (label: string): string => {
  const lower = label.toLowerCase();
  let m = lower.match(/burstavgof(\d+)/);
  if (m) return `burstavgof${m[1]}`;
  m = lower.match(/burst(\d+)of(\d+)/);
  if (m) return `burst${m[1]}of${m[2]}`;
  m = lower.match(/manual_iso(\d+)_shut([a-z0-9]+)/);
  if (m) return `manual_iso${m[1]}_shut${m[2]}`;
  return 'single';
};

// Illumination bucket. Reads from two sources, filename first (more
// authoritative when present) then parent directory. Filename source
// is the enriched `lightSLUG` token that parseFixtureFilename in
// analyze-fixtures.ts pushes into `tags` verbatim — we strip the
// prefix here to get 'sun' / 'shade' / 'led5000k'. Path source is
// the fixture-batch subdir naming convention (e.g. "0824 direct
// sunlight" → 'sun', "0824 open shade" → 'shade', "cloudy" →
// 'cloudy'), useful for legacy batches captured before the enriched
// filename convention landed. Returns 'unknown' when neither hits.
const illuminationOf = (sourcePath: string, tags: string[]): string => {
  for (const t of tags) {
    if (t.startsWith('light') && t.length > 5) return t.slice(5);
  }
  const lower = sourcePath.toLowerCase();
  if (lower.includes('direct sunlight') || lower.includes('direct sun')) {
    return 'sun';
  }
  if (lower.includes('open shade') || lower.includes('shade')) return 'shade';
  if (lower.includes('cloudy') || lower.includes('overcast')) return 'cloudy';
  if (lower.includes('indoor')) return 'indoor';
  return 'unknown';
};

const runDoc = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

// Analyze-fixtures emits one capture entry per WB anchor (self,
// whibal, postit, greycard), but the underlying sensor data (per-cell
// raw_linear_rgb, per-ref-card raw_linear_rgb) is identical across
// them — only the analyzer's baked-in WB math differs. Since the
// filmstrip now recomputes WB client-side from the user-picked ref
// cards, we only need one representative sample per (source_path ×
// cell × format). Dedup here so the HTML doesn't ship 4x redundant
// data.
// Per-source refOptions accumulator. Physical ref cards
// (whibal / postit / greycard) come from every variant's ref_cards.
// 'self' comes from the auto-WB variant only — cap.wb_correction
// picks a chart chip as anchor, so we look that chip up in the
// same capture's cells to get its raw + expected linear RGB.
// Samples of the same source share the same object by reference,
// so a self added later becomes visible on samples added earlier.
const refOptionsBySource = new Map<string, Sample['refOptions']>();
const sampleByKey = new Map<string, Sample>();
for (const cap of runDoc.captures) {
  const cells = cap.cells;
  if (!Array.isArray(cells)) continue;
  const sourcePath = cap.source_path ?? '';
  let refOptions = refOptionsBySource.get(sourcePath);
  if (!refOptions) {
    refOptions = {};
    refOptionsBySource.set(sourcePath, refOptions);
  }
  for (const rc of cap.ref_cards ?? []) {
    if (rc?.name && rc.raw_linear_rgb && rc.expected_linear_rgb &&
        !refOptions[rc.name]) {
      refOptions[rc.name] = {
        expected: rc.expected_linear_rgb,
        // Prefer pre-clamp mean when the analyzer produced one.
        // A bright anchor whose true post-WB R is 1.35 clipped to
        // 1.0 makes every gain computed against it too gentle —
        // the whole filmstrip shifts by (1 / 1.35). See
        // wbRgbScaleFromReference in cellResults.ts.
        raw: rc.raw_linear_rgb_unclamped ?? rc.raw_linear_rgb,
        rawDominant: rc.raw_linear_rgb_dominant ?? null,
      };
    }
  }
  // Self reference: only the auto-WB variant records its anchor
  // chip's notation. Match it against the capture's own cells to
  // recover raw + expected RGB. First auto variant encountered wins
  // (all auto variants of the same source pick the same anchor).
  if (cap.wb_correction?.source === 'auto' && !refOptions.self) {
    const anchorNotation = cap.wb_correction?.reference;
    if (typeof anchorNotation === 'string') {
      const anchorCell = cells.find(
        (c: any) => c.expected_notation === anchorNotation,
      );
      if (anchorCell?.raw_linear_rgb && anchorCell?.expected_linear_rgb) {
        refOptions.self = {
          expected: anchorCell.expected_linear_rgb,
          // Prefer unclamped for the self-anchor chip too — same
          // gain-under-correction logic applies when the auto-picked
          // anchor happens to be a bright chip.
          raw: anchorCell.raw_linear_rgb_unclamped ?? anchorCell.raw_linear_rgb,
          rawDominant: anchorCell.raw_linear_rgb_dominant ?? null,
        };
      }
    }
  }
  const illumUnevenness =
    cap.registration?.illumination?.unevenness ?? null;
  const format: 'raw' | 'photo' =
    cap.capture_format === 'photo' ? 'photo' : 'raw';
  for (const cell of cells) {
    if (!cell.expected_notation || !cell.raw_linear_rgb) continue;
    const key = sourcePath + '|' + cell.physical_row +
      '|' + cell.physical_col + '|' + format;
    if (sampleByKey.has(key)) continue;
    sampleByKey.set(key, {
      expected: cell.expected_notation,
      page: cap.page,
      tags: cap.environment?.tags ?? [],
      fixtureLabel: cap.label ?? '',
      format,
      device: deviceOf(sourcePath),
      bg: bgOf(sourcePath),
      illumUnevenness,
      expectedRgb: cell.expected_linear_rgb,
      // Prefer unclamped chip mean so bright chips (5/6+ value) go
      // through the client-side WB × CCM math with their true
      // signal instead of a clipped 1.0. See analyzer's
      // wbRgbScaleFromReference note for the direction of the bias.
      rawRgb: cell.raw_linear_rgb_unclamped ?? cell.raw_linear_rgb,
      rawRgbDominant: cell.raw_linear_rgb_dominant ?? null,
      refOptions,
      captureType: captureTypeOf(cap.label ?? ''),
      illumination: illuminationOf(sourcePath, cap.environment?.tags ?? []),
    });
  }
}
const samples: Sample[] = Array.from(sampleByKey.values());
process.stderr.write(
  `loaded ${samples.length} deduped samples from ${jsonPath} ` +
    `(${runDoc.captures.length} captures)\n`,
);

// ---- Chip lattice (~440 chips across all pages) ----------------------------

type Chip = {
  notation: string;
  hue: string;
  value: number;
  chroma: number;
  rgb: [number, number, number]; // linear-sRGB
};

const chipMap = new Map<string, Chip>();
for (const page of MUNSELL_PAGES) {
  for (const cell of pageCells(page)) {
    if (chipMap.has(cell.notation)) continue;
    chipMap.set(cell.notation, {
      notation: cell.notation,
      hue: cell.hue,
      value: cell.value,
      chroma: cell.chroma,
      rgb: [
        cell.expectedLinearRgb.r,
        cell.expectedLinearRgb.g,
        cell.expectedLinearRgb.b,
      ],
    });
  }
}
const chips = Array.from(chipMap.values());
process.stderr.write(`ground-truth chip lattice: ${chips.length} chips\n`);

// ---- HTML template ---------------------------------------------------------

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Munsell error filmstrip — ${runDoc.generated_at ?? ''}</title>
<!-- three.js + OrbitControls for the 3D stacked view. Pinned to
     r147 — the last release before examples/js was removed, so the
     non-ESM UMD builds still expose THREE and THREE.OrbitControls
     as globals for the inline <script> below to consume. -->
<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/controls/OrbitControls.js"></script>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
         margin: 20px; color: #222; background: #fafafa; }
  h1 { margin: 0 0 4px 0; font-size: 20px; }
  .meta { color: #666; font-size: 12px; margin-bottom: 12px; }
  .split-layout { display: flex; gap: 20px; align-items: flex-start; }
  .left-panel { flex: 0 0 380px; }
  /* min-width:0 lets the right panel actually shrink below its
     intrinsic content width when the window narrows — otherwise
     flex children default to min-content and refuse to compress. */
  .right-panel { flex: 1 1 auto; min-width: 0; }
  #controls { display: flex; flex-direction: column; gap: 10px;
              padding: 12px 16px; background: #fff; border: 1px solid #ddd;
              border-radius: 6px; margin-bottom: 12px; }
  #controls fieldset { border: 1px solid #ddd; padding: 6px 10px; margin: 0;
                       border-radius: 4px; font-size: 13px; width: 100%;
                       box-sizing: border-box; }
  #controls legend { padding: 0 4px; font-weight: 600; font-size: 12px;
                     color: #555; }
  #controls label { display: block; padding: 1px 0; cursor: pointer; }
  #ctl-heatmap-axes { display: flex; flex-wrap: wrap; gap: 6px 14px;
    align-items: center; padding: 8px 16px; background: #fff;
    border: 1px solid #ddd; border-radius: 6px; margin-bottom: 12px;
    font-size: 13px; }
  #ctl-heatmap-axes legend { padding: 0 6px; font-weight: 600;
    font-size: 12px; color: #555; }
  #ctl-heatmap-axes label { display: inline-flex; align-items: center;
    gap: 4px; cursor: default; color: #555; }
  #ctl-heatmap-axes select { font-size: 12px; padding: 2px 4px; }
  #view-switcher { display: flex; gap: 14px; align-items: center;
                   padding: 8px 16px; background: #fff;
                   border: 1px solid #ddd; border-radius: 6px;
                   margin-bottom: 12px; font-size: 13px; }
  #view-switcher .vs-label { font-weight: 600; color: #555; margin-right: 4px; }
  #view-switcher label { cursor: pointer; }
  #summary { font-size: 13px; color: #444; margin-bottom: 8px; }
  #filmstrip { display: flex; flex-direction: column; gap: 16px; }
  .polar-row { display: flex; flex-wrap: wrap; gap: 12px; }
  .polar-facet-title { font-size: 13px; color: #444;
    padding: 4px 0 0; border-top: 1px solid #eee; }
  .polar-facet-title .n { color: #888; font-size: 11px;
    font-weight: 400; margin-left: 4px; }
  .disk { background: #fff; border: 1px solid #ddd; border-radius: 6px;
          padding: 8px; }
  .disk h3 { margin: 0 0 4px 0; font-size: 13px; color: #444; text-align: center; }
  .disk svg { display: block; background: #fff; }
  .legend-row { display: flex; align-items: center; gap: 10px;
                font-size: 12px; color: #555; margin: 6px 0 10px 0; }
  .legend-swatch { width: 220px; height: 12px;
    background: linear-gradient(to right,
      #0055aa, #4488cc, #99bbdd, #eeeeee, #ddaa88, #cc6644, #aa2211); }
  .heatmap-table { border-collapse: collapse; font-size: 12px;
    background: #fff; }
  .heatmap-table th, .heatmap-table td {
    border: 1px solid #ddd; padding: 6px 8px; text-align: center;
    min-width: 54px; }
  .heatmap-table thead th, .heatmap-table tbody th {
    background: #f4f4f4; color: #444; font-weight: 600;
    font-variant-numeric: tabular-nums; }
  .heatmap-table td.empty { background: #fafafa; color: #ccc; }
  .heatmap-table td .n { display: block; font-size: 10px;
    color: rgba(0,0,0,0.55); font-weight: 400; }
  #heatmap-body, #bar-body, #xy-body, #channels-body {
    display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }
  .xy-hint { padding: 20px; background: #fff8e1; border: 1px solid #f0d060;
    border-radius: 4px; color: #6a4a00; font-size: 12px; max-width: 640px;
    line-height: 1.5; }
  .xy-hint code { background: #ffedb0; padding: 1px 4px; border-radius: 2px; }
  .heat-facet { background: #fff; border: 1px solid #ddd;
    border-radius: 6px; padding: 8px 10px; }
  .heat-facet-title { font-size: 12px; font-weight: 600;
    color: #444; margin-bottom: 6px; }
  .heat-facet-title .n { font-weight: 400; color: #888; }
  .bar-table { border-collapse: collapse; font-size: 12px; }
  .bar-table th, .bar-table td { padding: 3px 8px; text-align: left;
    border-bottom: 1px solid #eee; }
  .bar-table th { font-weight: 600; color: #444; background: #f7f7f7; }
  .bar-table td.axis { font-variant-numeric: tabular-nums;
    white-space: nowrap; }
  .bar-table td.bar-cell { min-width: 220px; padding: 4px 8px; }
  .bar-track { position: relative; height: 14px; background: #f2f2f2;
    border-radius: 3px; }
  .bar-fill { position: absolute; top: 0; left: 0; height: 14px;
    border-radius: 3px; }
  .bar-num { display: inline-block; min-width: 34px; text-align: right;
    font-variant-numeric: tabular-nums; margin-left: 8px; }
  .bar-n { color: #888; font-size: 10px; margin-left: 6px;
    font-variant-numeric: tabular-nums; }
</style>
</head>
<body>
<h1>Munsell error filmstrip</h1>
<div class="meta">
  source: <code>${jsonPath}</code>
  · captures: ${runDoc.captures.length}
  · samples: ${samples.length}
  · chips: ${chips.length}
  · generated: ${runDoc.generated_at ?? ''}
</div>

<div class="split-layout">
  <div class="left-panel">
    <div id="controls">
      <fieldset id="ctl-chart-type">
        <legend>Chart</legend>
      </fieldset>
      <fieldset id="ctl-format">
        <legend>Format</legend>
      </fieldset>
      <fieldset id="ctl-reducer">
        <legend>ROI reducer</legend>
        <div style="font-size: 10px; color: #888; margin-top: 4px;">
          <code>mean</code> = per-channel arithmetic average (default).
          <code>dominant</code> = median-cut posterise, biggest colour
          cluster in the ROI — matches the legacy JPEG dominantColor
          path and is robust to off-tone flecks. Flips WB fit, ΔE,
          rankings, all downstream math. Samples without a dominant
          (photo-path, legacy runs) fall back silently to mean.
        </div>
      </fieldset>
      <fieldset id="ctl-first-ref">
        <legend>First reference (WB anchor)</legend>
        <div style="font-size: 10px; color: #888; margin-top: 4px;">
          Anchors <code>measured = raw × gain</code> per channel.
        </div>
      </fieldset>
      <fieldset id="ctl-second-ref">
        <legend>Second reference (optional)</legend>
        <div style="font-size: 10px; color: #888; margin-top: 4px;">
          Adds a second calibration point — WB becomes
          <code>measured = raw × gain + offset</code> per channel,
          which corrects sensor offset that a one-ref fit can't see.
          Options exclude the first ref.
        </div>
      </fieldset>
      <fieldset id="ctl-ccm">
        <legend>Tuned 3×3 CCM (experimental)</legend>
        <div style="font-size: 10px; color: #888; margin-top: 4px;">
          Fit <code>M · raw ≈ expected</code> (least squares, cross-channel
          mixing) from the currently-filtered chart chips + ref cards.
          Replaces WB when applied. Narrow the primary filters (device,
          bg, card) first so the fit is per-scenario. See
          <code>docs/munsell-dark-sensor.md</code> option #7.
        </div>
        <div id="ccm-controls" style="margin-top: 6px; display: flex;
             flex-direction: column; gap: 4px;">
          <button id="ccm-fit-btn" type="button" style="font-size: 12px;
                  padding: 3px 8px; cursor: pointer;">
            Make tuned CCM from filtered
          </button>
          <label style="font-size: 12px;">
            <input type="checkbox" id="ccm-apply-toggle" /> Apply CCM
            (replaces WB in results)
          </label>
          <button id="ccm-clear-btn" type="button" style="font-size: 11px;
                  padding: 2px 6px; cursor: pointer; align-self: flex-start;">
            Clear
          </button>
        </div>
        <div id="ccm-viz" style="margin-top: 6px; font-size: 11px;
             color: #444;"></div>
      </fieldset>
      <fieldset id="ctl-device">
        <legend>Device</legend>
      </fieldset>
      <fieldset id="ctl-bg">
        <legend>Background paper</legend>
      </fieldset>
      <fieldset id="ctl-uneven">
        <legend>Max illum unevenness</legend>
      </fieldset>
      <fieldset id="ctl-worst-de">
        <legend>Max fixture worst ΔE</legend>
      </fieldset>
      <fieldset id="ctl-min-signal">
        <legend>Min signal (greycard min RGB)</legend>
      </fieldset>
      <fieldset id="ctl-excluded">
        <legend>Excluded chips</legend>
      </fieldset>
      <fieldset id="ctl-excluded-cards">
        <legend>Excluded fixtures</legend>
      </fieldset>
      <fieldset id="ctl-card">
        <legend>Card (Munsell page)</legend>
      </fieldset>
      <fieldset id="ctl-capture-type">
        <legend>Capture type (burst / avg / manual)</legend>
      </fieldset>
      <fieldset id="ctl-illumination">
        <legend>Illumination (sun / shade / …)</legend>
      </fieldset>
      <fieldset id="ctl-fixture">
        <legend>Fixture (narrowed by card / device / format / bg / capture type)</legend>
      </fieldset>
    </div>
  </div>

  <div class="right-panel">
    <fieldset id="ctl-heatmap-axes" style="display: none;">
      <legend>Axes</legend>
      <label>heatmaps
        <select id="heat-facet-axis"></select></label>
      <label>rows
        <select id="heat-row-axis"></select></label>
      <label>cols
        <select id="heat-col-axis"></select></label>
      <label>metric
        <select id="heat-metric">
          <option value="deltaE">ΔE</option>
          <option value="meaValue">measured value</option>
          <option value="meaChroma">measured chroma</option>
          <option value="meaHueAngle">measured hue angle</option>
        </select></label>
      <label>agg
        <select id="heat-agg">
          <option value="mean">mean</option>
          <option value="median">median</option>
        </select></label>
      <label id="heat-chan-src-label" style="display:none;">channels source
        <select id="heat-chan-src">
          <option value="measured">measured (post-WB)</option>
          <option value="raw">raw (pre-WB)</option>
        </select></label>
    </fieldset>
    <div id="view-switcher">
      <span class="vs-label">Polar view:</span>
      <label><input type="radio" name="view" value="per-level" checked>
        Per-level (2D disks)</label>
      <label><input type="radio" name="view" value="3d">
        3D stacked (Munsell)</label>
      <label><input type="radio" name="view" value="lab-3d">
        3D scatter (Lab; distance = ΔE)</label>
      <span style="margin-left:8px;font-size:11px;color:#888;">
        (only shown when chart = polar disks)
      </span>
    </div>

    <div class="legend-row" id="polar-legend">
      <span>ΔValue color:</span>
      <span>−2</span>
      <span class="legend-swatch"></span>
      <span>+2</span>
      <span style="margin-left:16px">blue = predicted too dark · red = too light</span>
    </div>

    <div id="summary"></div>

    <div id="view-per-level" class="view-panel">
      <div id="filmstrip"></div>
    </div>

    <div id="view-3d" class="view-panel" style="display: none;">
      <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
        Values stack V=1 (bottom) → V=10 (top).
        Drag to rotate · scroll to zoom · shift-drag (or right-drag) to pan.
        Chip spheres are the ground-truth Munsell lattice at each value
        level; lines run from expected → measured, coloured by ΔValue.
        Filters at left apply.
      </div>
      <div id="viz3d" style="width: 100%;
        height: calc(100vh - 240px); min-height: 500px;
        background: #f0f0f0; border: 1px solid #ddd; border-radius: 6px;
        overflow: hidden;"></div>
    </div>

    <div id="view-lab-3d" class="view-panel" style="display: none;">
      <div style="font-size: 12px; color: #666; margin-bottom: 8px;">
        CIE Lab space — chips positioned at (a*, L*, b*). Central
        vertical axis = neutrals (L* 0→100). Chips fan out around it
        by chroma and hue direction. Distance in this view <b>directly
        equals ΔE₀₀</b> (well, ΔE₇₆; within ~10% of ΔE₀₀ for most
        chips). Drag to rotate, scroll to zoom, shift-drag to pan.
      </div>
      <div id="vizLab3d" style="width: 100%;
        height: calc(100vh - 240px); min-height: 500px;
        background: #f0f0f0; border: 1px solid #ddd; border-radius: 6px;
        overflow: hidden;"></div>
    </div>

    <div id="view-heatmap" class="view-panel" style="display: none;">
      <div id="heatmap-title" style="font-size: 12px; color: #666;
        margin-bottom: 8px;"></div>
      <div id="heatmap-body" style="overflow: auto;"></div>
    </div>

    <div id="view-bar" class="view-panel" style="display: none;">
      <div id="bar-title" style="font-size: 12px; color: #666;
        margin-bottom: 8px;"></div>
      <div id="bar-body" style="overflow: auto;"></div>
    </div>

    <div id="view-xy" class="view-panel" style="display: none;">
      <div id="xy-title" style="font-size: 12px; color: #666;
        margin-bottom: 8px;"></div>
      <div id="xy-body" style="overflow: auto;"></div>
    </div>

    <div id="view-channels" class="view-panel" style="display: none;">
      <div id="channels-title" style="font-size: 12px; color: #666;
        margin-bottom: 8px;"></div>
      <div id="channels-body" style="overflow: auto;"></div>
    </div>
  </div>
</div>

<script>
const SAMPLES = ${JSON.stringify(samples)};
const CHIPS = ${JSON.stringify(chips)};
// Chip notations flagged in scripts/excluded-chips.json — surfaced
// to the filmstrip so users can hide known-defective chips from
// every chart (heatmap, bar, xy, polar) with one checkbox.
const EXCLUDED_CHIPS = new Set(${JSON.stringify(runDoc.excluded_chips ?? [])});
// Fixture labels flagged in scripts/excluded-cards.json — bad
// registration / mis-framed shots that should be filtered out of
// analyses by default. Match against sample.fixtureLabel.
const EXCLUDED_CARDS = new Set(${JSON.stringify(runDoc.excluded_cards ?? [])});

// Lookup: hue string ("10YR", "5R", …) → representative Chip. Used
// by the hue-mode XY chart to draw a swatch strip below the delta
// panel. Ranking prefers chroma ~6 (visibly saturated but typical
// for soils) with a small tiebreaker toward value 5 (mid-lightness,
// good visual anchor). Falls back to closest available if the
// preferred slot doesn't exist for that hue.
const chipsByHue = new Map();
for (const c of CHIPS) {
  if (!chipsByHue.has(c.hue)) chipsByHue.set(c.hue, []);
  chipsByHue.get(c.hue).push(c);
}
for (const list of chipsByHue.values()) {
  list.sort((a, b) => {
    const sa = -Math.abs(a.chroma - 6) - 0.4 * Math.abs(a.value - 5);
    const sb = -Math.abs(b.chroma - 6) - 0.4 * Math.abs(b.value - 5);
    return sb - sa;
  });
}
function representativeChipFor(hueStr) {
  const list = chipsByHue.get(hueStr);
  return list && list.length ? list[0] : null;
}

// ---- Colour math (linear sRGB → Lab → ΔE2000) --------------------------
// Standalone client-side implementations so the filmstrip can
// recompute WB per-render without needing the analyzer's Node-only
// helpers. Numerically compatible with the analyzer's linearRgbToXyz
// + xyzToLab + ΔE2000 to within display precision.
const _labE = 216 / 24389;
const _labK = 24389 / 27;
function _labF(t) { return t > _labE ? Math.cbrt(t) : (_labK * t + 16) / 116; }
function rgbToLab(rgb) {
  const r = rgb[0], g = rgb[1], b = rgb[2];
  const X = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const Y = 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
  const Z = 0.0193339 * r + 0.1191920 * g + 0.9503041 * b;
  const fx = _labF(X / 0.95047);
  const fy = _labF(Y / 1.0);
  const fz = _labF(Z / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
// CIE ΔE2000 — Sharma 2005 formulation. Reference points: pass A
// then B; symmetric.
function deltaE2000(labA, labB) {
  const L1 = labA[0], a1 = labA[1], b1 = labA[2];
  const L2 = labB[0], a2 = labB[1], b2 = labB[2];
  const kL = 1, kC = 1, kH = 1;
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
  const dLterm = dLp / (kL * SL);
  const dCterm = dCp / (kC * SC);
  const dHterm = dHp / (kH * SH);
  return Math.sqrt(dLterm * dLterm + dCterm * dCterm + dHterm * dHterm +
    RT * dCterm * dHterm);
}

// Precompute chip Lab once — nearest-chip lookup runs per sample per
// render, so this saves ~440 conversions * 17k samples = a lot.
const CHIP_LABS = CHIPS.map(c => rgbToLab(c.rgb));
function nearestChipNotation(measRgb) {
  const measLab = rgbToLab(measRgb);
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < CHIPS.length; i++) {
    const cl = CHIP_LABS[i];
    const dL = measLab[0] - cl[0];
    const da = measLab[1] - cl[1];
    const db = measLab[2] - cl[2];
    const d = dL * dL + da * da + db * db;
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  }
  return CHIPS[bestIdx].notation;
}

// Reducer-aware raw accessors. Every call site that reads a sample's
// or a ref card's raw linear-sRGB should go through these — flipping
// state.reducer between 'mean' and 'dominant' then re-runs all
// downstream math on the picked reducer. When state.reducer is
// 'dominant' but the sample/ref has no dominant (legacy runs, photo
// path), fall back to mean so nothing silently disappears.
function rawOfSample(s) {
  return state.reducer === 'dominant' && s.rawRgbDominant
    ? s.rawRgbDominant
    : s.rawRgb;
}
function rawOfRef(ref) {
  return state.reducer === 'dominant' && ref.rawDominant
    ? ref.rawDominant
    : ref.raw;
}

// Client-side WB fit. Two modes: single-ref (gain-only, forced
// through origin) and two-ref (gain + offset). Per-channel — computed
// independently for R, G, B. Returns null if the refs aren't
// available in this sample's shot (missing card, etc.); caller
// drops the sample.
function computeWB(refOptions, firstRef, secondRef) {
  const ref1 = refOptions[firstRef];
  if (!ref1) return null;
  const raw1 = rawOfRef(ref1);
  if (secondRef === 'none' || !refOptions[secondRef]) {
    return {
      gain: [
        raw1[0] > 0 ? ref1.expected[0] / raw1[0] : 1,
        raw1[1] > 0 ? ref1.expected[1] / raw1[1] : 1,
        raw1[2] > 0 ? ref1.expected[2] / raw1[2] : 1,
      ],
      offset: [0, 0, 0],
    };
  }
  const ref2 = refOptions[secondRef];
  const raw2 = rawOfRef(ref2);
  const gain = [0, 0, 0];
  const offset = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const dRaw = raw1[k] - raw2[k];
    // Degenerate: both refs read the same on this channel. Fall
    // back to single-ref gain — better than divide-by-zero.
    if (Math.abs(dRaw) < 1e-6) {
      gain[k] = raw1[k] > 0 ? ref1.expected[k] / raw1[k] : 1;
      offset[k] = 0;
    } else {
      gain[k] = (ref1.expected[k] - ref2.expected[k]) / dRaw;
      offset[k] = ref1.expected[k] - raw1[k] * gain[k];
    }
  }
  return {gain, offset};
}
function applyWB(rgb, wb) {
  return [
    Math.max(0, rgb[0] * wb.gain[0] + wb.offset[0]),
    Math.max(0, rgb[1] * wb.gain[1] + wb.offset[1]),
    Math.max(0, rgb[2] * wb.gain[2] + wb.offset[2]),
  ];
}

// ---- Tuned 3×3 CCM (experimental) ---------------------------------------

// Analytic 3×3 inverse. Used inside the normal-equations solver for the
// CCM fit — we compute (X · Xᵀ)⁻¹ once per row of M. Throws on
// near-singular input (shouldn't happen with 30+ chart samples but
// guards against a filtered-to-nothing corner case).
function invert3x3(m) {
  const a = m[0], b = m[1], c = m[2];
  const d = m[3], e = m[4], f = m[5];
  const g = m[6], h = m[7], i = m[8];
  const A =  (e * i - f * h);
  const B = -(d * i - f * g);
  const C =  (d * h - e * g);
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) throw new Error('CCM fit: singular normal matrix');
  const invDet = 1 / det;
  return [
    A * invDet,  -(b * i - c * h) * invDet,   (b * f - c * e) * invDet,
    B * invDet,   (a * i - c * g) * invDet,  -(a * f - c * d) * invDet,
    C * invDet,  -(a * h - b * g) * invDet,   (a * e - b * d) * invDet,
  ];
}

function matVec3(m, v) {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

// Fit a 3×3 M such that M · raw ≈ expected in the least-squares sense
// over the supplied (raw, expected) pairs. Each row of M is solved
// independently as a 3-parameter linear regression: m_iᵀ = y_i · Xᵀ ·
// (X · Xᵀ)⁻¹. Well-overdetermined at 24+ chips × 3 channels = 72+
// equations for 9 unknowns; numerically stable without any weighting.
//
// Also computes residual ΔE on the training samples so the UI can
// display "training fit quality" (a proxy for whether the fixed
// scenario the fit was done over is coherent enough for a linear
// CCM to explain).
function fitCCM(pairs) {
  const n = pairs.length;
  if (n < 4) return null;
  // Build X · Xᵀ (3×3) and X · Yᵀ (3×3 too — cols indexed by output ch).
  const XXt = [0,0,0, 0,0,0, 0,0,0];
  const XYt = [0,0,0, 0,0,0, 0,0,0];
  for (const {raw, expected} of pairs) {
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      XXt[r * 3 + c] += raw[r] * raw[c];
      XYt[r * 3 + c] += raw[r] * expected[c];
    }
  }
  const XXt_inv = invert3x3(XXt);
  // Solve each row of M independently (each row is a 3-parameter
  // linear regression of one output channel on all three raw
  // channels): m_row = XYt-column times XXt_inv.
  const matrix = [0,0,0, 0,0,0, 0,0,0];
  for (let out = 0; out < 3; out++) {
    // Row "out" of M: coeffs on raw R, G, B.
    for (let j = 0; j < 3; j++) {
      let s = 0;
      for (let k = 0; k < 3; k++) {
        s += XYt[k * 3 + out] * XXt_inv[k * 3 + j];
      }
      matrix[out * 3 + j] = s;
    }
  }
  // Residual ΔE on the training set.
  let sumDe = 0;
  let maxDe = 0;
  for (const {raw, expected} of pairs) {
    const pred = matVec3(matrix, raw);
    const de = deltaE2000(rgbToLab(pred), rgbToLab(expected));
    sumDe += de;
    if (de > maxDe) maxDe = de;
  }
  return {
    matrix,
    meanResidualDe: sumDe / n,
    maxResidualDe: maxDe,
    nSamples: n,
  };
}

function applyCCM(rgb, matrix) {
  const out = matVec3(matrix, rgb);
  return [Math.max(0, out[0]), Math.max(0, out[1]), Math.max(0, out[2])];
}

// Render the CCM matrix as a 3×3 HTML table with cell color coding.
// Diagonal cells: green tint if close to 1 (sensor near-identity),
// red tint if far. Off-diagonal cells: neutral if close to 0
// (little cross-channel mixing), amber if non-trivial. Includes the
// residual ΔE stats so users can gauge whether the fit was clean or
// under-determined (a training-set residual bigger than the raw
// jaggedness we're trying to fix = the CCM can't explain the error,
// which means metameric failure isn't fully linear either).
function renderCcmViz(ccm) {
  if (!ccm) {
    return '<div style="color:#888; font-style:italic">' +
      'No CCM yet. Narrow filters + click "Make tuned CCM".</div>';
  }
  const labels = ['R', 'G', 'B'];
  const cellStyle = (row, col) => {
    const v = ccm.matrix[row * 3 + col];
    const isDiag = row === col;
    if (isDiag) {
      // Distance from 1 for the diagonal: 0 = perfect, 0.3 = notable.
      const d = Math.min(1, Math.abs(v - 1) / 0.3);
      const alpha = 0.15 + 0.55 * d;
      return 'background: rgba(220, 60, 60, ' + alpha.toFixed(2) + ');';
    }
    // Off-diagonal: magnitude flags cross-channel mixing.
    const d = Math.min(1, Math.abs(v) / 0.3);
    if (Math.abs(v) < 0.02) return 'background: #f2f2f2;';
    const alpha = 0.15 + 0.5 * d;
    const rgbTint = v > 0 ? '240,170,50' : '80,140,200';
    return 'background: rgba(' + rgbTint + ', ' + alpha.toFixed(2) + ');';
  };
  let html = '<div style="font-weight:600; font-size:11px;' +
    ' margin-bottom:3px;">M · raw = measured</div>';
  html += '<table style="border-collapse: collapse; font-size:11px;' +
    ' font-variant-numeric: tabular-nums;"><thead><tr>' +
    '<th></th>' +
    labels.map(l => '<th style="padding:2px 5px; font-weight:600;' +
      ' color:#888;">raw ' + l + '</th>').join('') +
    '</tr></thead><tbody>';
  for (let r = 0; r < 3; r++) {
    html += '<tr><td style="padding:2px 5px; font-weight:600; color:#888;">' +
      'out ' + labels[r] + '</td>';
    for (let c = 0; c < 3; c++) {
      const v = ccm.matrix[r * 3 + c];
      html += '<td style="padding:3px 6px; border:1px solid #ddd; ' +
        'text-align:right; ' + cellStyle(r, c) + '">' +
        v.toFixed(3) + '</td>';
    }
    html += '</tr>';
  }
  html += '</tbody></table>';
  html += '<div style="margin-top:5px; color:#666;">' +
    'Fit on <strong>' + ccm.nSamples + '</strong> sample' +
    (ccm.nSamples === 1 ? '' : 's') + '. ' +
    'Training-set residual: mean ΔE <strong>' +
    ccm.meanResidualDe.toFixed(2) + '</strong>, ' +
    'max <strong>' + ccm.maxResidualDe.toFixed(2) +
    '</strong>.</div>';
  html += '<div style="margin-top:3px; color:#999; font-size:10px;">' +
    'Diagonal red = far from 1. Off-diag amber/blue = cross-channel mixing.</div>';
  return html;
}

// ---- Munsell notation parser --------------------------------------------
// Standard chip:   "10YR 5/4"   "2.5YR 7.5/2"
// Fractional pred: "8YR 5.7/1.3"
// Neutral:         "N 5/0" / "N 5"
// Fallback string: "10YR (?)  [fallback: 10YR 5/1]" — skip.
const NOTATION_RE = /^(\\d+(?:\\.\\d+)?)([A-Z]{1,3})\\s+(\\d+(?:\\.\\d+)?)\\/(\\d+(?:\\.\\d+)?)$/;
const NEUTRAL_RE  = /^N\\s+(\\d+(?:\\.\\d+)?)(?:\\/(\\d+(?:\\.\\d+)?))?$/;
function parseNotation(s) {
  if (!s || s.includes('(?)') || s.includes('fallback:')) return null;
  const n = s.trim();
  let m = NEUTRAL_RE.exec(n);
  if (m) return {family: 'N', step: 0, value: parseFloat(m[1]),
                 chroma: m[2] ? parseFloat(m[2]) : 0};
  m = NOTATION_RE.exec(n);
  if (!m) return null;
  return {family: m[2], step: parseFloat(m[1]),
          value: parseFloat(m[3]), chroma: parseFloat(m[4])};
}

// Munsell hue → angle. Family order R→YR→Y→GY→G→BG→B→PB→P→RP; each
// family spans 36°, each 2.5-step 9°. Origin: 10YR at 0° (top of disk)
// so soil hues sit near the top and read left-to-right cool→warm.
// Angle is degrees CW from 12 o'clock (SVG-native convention).
const FAMILIES = ['R','YR','Y','GY','G','BG','B','PB','P','RP'];
function hueAngle(family, step) {
  if (family === 'N') return 0;
  const fi = FAMILIES.indexOf(family);
  if (fi < 0) return 0;
  // position 0..39, one per 2.5-hue step
  const pos = fi * 4 + (step / 2.5 - 1);
  // Anchor 10YR at 0°. 10YR is family=YR, step=10 → pos = 1*4 + 3 = 7.
  return (pos - 7) * 9;
}

// Convert (angle CW from top, radius) → (x, y) in SVG coords centred
// at (cx, cy).
function polarToXY(cx, cy, r, angleDeg) {
  const a = angleDeg * Math.PI / 180;
  return {x: cx + r * Math.sin(a), y: cy - r * Math.cos(a)};
}

// Diverging blue → grey → red for ΔValue in [-2, +2].
function deltaValueColor(dv) {
  const t = Math.max(-1, Math.min(1, dv / 2));
  // Interpolate between three anchors: blue #0055aa → grey #eeeeee → red #aa2211.
  const cool = [0x00, 0x55, 0xaa];
  const grey = [0xee, 0xee, 0xee];
  const warm = [0xaa, 0x22, 0x11];
  const [a, b, mix] = t < 0 ? [cool, grey, 1 + t] : [grey, warm, t];
  const r = Math.round(a[0] + (b[0] - a[0]) * mix);
  const g = Math.round(a[1] + (b[1] - a[1]) * mix);
  const bl = Math.round(a[2] + (b[2] - a[2]) * mix);
  return 'rgb(' + r + ',' + g + ',' + bl + ')';
}

// linear sRGB → gamma-encoded hex (for chip fill).
function rgbHex(rgb) {
  const enc = v => {
    const c = Math.max(0, Math.min(1, v));
    const g = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1/2.4) - 0.055;
    return Math.round(g * 255).toString(16).padStart(2, '0');
  };
  return '#' + enc(rgb[0]) + enc(rgb[1]) + enc(rgb[2]);
}

// ---- Filter UI ----------------------------------------------------------

const state = {
  // Format filter: 'all' | 'raw' | 'photo'. Since each capture pair
  // produces two samples per chip (one from the DNG, one from the
  // JPEG), the default 'all' shows both stacked; picking one isolates
  // that pipeline.
  format: 'all',
  // Max illumination unevenness (max-of-col-range, row-range across
  // matched-grid inliers). Samples from captures above this threshold
  // are hidden. Slider max = 100 = show all. Default 20 = only
  // evenly-lit captures.
  maxUneven: 20,
  // Excluded-chips filter (checkbox). Defaults to ON when the
  // excluded list is non-empty so users see the "cleanest" view by
  // default; uncheck to bring them back in.
  excludeFlaggedChips: EXCLUDED_CHIPS.size > 0,
  // Excluded-cards filter — drops all samples whose fixtureLabel is
  // in the excluded-cards list (poor registration, mis-framed, etc.).
  // Same "default on when list non-empty" convention.
  excludeFlaggedCards: EXCLUDED_CARDS.size > 0,
  // Max fixture worst-ΔE gate. 50 = "off" (no fixture excluded).
  // Below that, samples from fixtures whose max-per-cell ΔE exceeds
  // the slider are dropped entirely — good for surfacing only the
  // captures we trust when eyeballing calibration signals.
  maxWorstDe: 50,
  // Min signal strength (greycard min-R/G/B, 0..0.35+). 0 = off.
  // Drops fixtures where the sensor's weakest channel didn't collect
  // enough signal to distinguish chip content from noise floor —
  // the exact failure mode we saw in the dim Pixel 7 red shot.
  minSignal: 0,
  // Multi-select filters. Empty set = "no filter" (all values pass);
  // any values in the set are the allowed values. Populated by
  // initControls once SAMPLES is available.
  device: new Set(),
  bg: new Set(),
  // card = Munsell page (10YR, 5R, …).
  card: new Set(),
  // Fixture (shutter) multi-select. Narrows to specific captures so
  // the user can tell whether jumpy per-chip data across an axis
  // comes from one messy fixture or the average of many. Options
  // list is dynamically reduced to fixtures matching the current
  // card / device / format / bg / captureType selection.
  fixture: new Set(),
  // Capture-type multi-select. Same buckets the 'capture type' heatmap
  // axis exposes (burst1of5 … burstNofM, burstavgofN, manual_isoX_shutY,
  // single). Lets the user narrow a whole batch to a specific shot
  // kind (e.g. only burstavg captures, only manual_iso100_shut33ms)
  // without picking each fixture by name.
  captureType: new Set(),
  // Illumination multi-select. Buckets are 'sun', 'shade', 'cloudy',
  // 'indoor', 'ledXXXXk', 'unknown'. Derived from the enriched-filename
  // 'lightSLUG' tag first, then from the fixture parent directory
  // path (see illuminationOf). Lets the user A/B compare the same
  // chart under direct sunlight vs. open shade on a mixed batch.
  illumination: new Set(),
  // Client-side WB reference cards. First is required (default =
  // greycard, the most-trusted anchor); second is optional (default
  // = 'none' → single-ref gain-only fit). Picking a second enables
  // the two-ref gain+offset fit.
  firstRef: 'greycard',
  secondRef: 'none',
  // ROI reducer: 'mean' (per-channel arithmetic average) or 'dominant'
  // (median-cut posterise "biggest cluster"). Flips the whole
  // filmstrip: WB fit, per-chip ΔE, ref-card ΔE, ranking tables — all
  // consume rawRgb (mean) or rawRgbDominant (dominant) depending on
  // this pick. Samples whose dominant is unavailable (legacy runs,
  // photo path) fall back to mean so nothing disappears when the
  // radio flips; a small badge could later flag which samples fell
  // back if this becomes confusing.
  reducer: 'mean',
  // Chart type: 'polar' (existing 2D/3D disks) | 'heatmap' | 'bar'.
  chartType: 'polar',
  // Heatmap axes + aggregation. Defaults: rows = expected value, cols
  // = expected chroma (matches the classic "how does ΔE vary across
  // the chip lattice?" view). facetAxis = 'all' means one heatmap
  // over all filtered samples; any other value emits one heatmap per
  // distinct value of that dimension (e.g. facetAxis='device' → one
  // heatmap per device).
  facetAxis: 'all',
  rowAxis: 'expValue',
  colAxis: 'expChroma',
  // metric = what per-sample number to aggregate: ΔE (default, colour
  // = error), measured Munsell value, or measured Munsell chroma.
  // Non-ΔE metrics let the heatmap show whether the algorithm's
  // measured values track expected linearly across the chart lattice.
  metric: 'deltaE',
  aggFn: 'mean',
  // Channels chart: pick which linear-sRGB triple the Y axis reads.
  // 'measured' = post-WB (what the app actually produces); 'raw' =
  // pre-WB (native sensor read, useful to isolate WB miscalibration
  // from a sensor offset / stray-light issue).
  channelSource: 'measured',
  // Experimental tuned 3×3 CCM. Null when not fit. When ccmApplied,
  // replaces WB in filterSamples: measured = M · raw. Fit lazily on
  // button click from the currently-filtered chips + ref cards, so
  // narrowing device/bg/card first produces a scenario-specific M.
  // See docs/munsell-dark-sensor.md option #7 for context.
  ccm: null,            // {matrix: number[9], meanResidualDe, maxResidualDe, nSamples, fittedFrom: {device, bg, format}}
  ccmApplied: false,
};

// Options for the heatmap row/col axis pickers. Any Sample-derived
// (or notation-derived) categorical dimension can be a heatmap axis.
// Value / chroma / hue are split into expected (from the ground-truth
// chip notation) and measured (from what the algorithm read) so the
// heatmap can compare the two directly — e.g. rows = expected hue,
// cols = measured hue → diagonal = perfect, off-diagonal = confusion.
const HEATMAP_AXIS_OPTIONS = [
  {value: 'expValue',    label: 'value (expected)'},
  {value: 'meaValue',    label: 'value (measured)'},
  {value: 'expChroma',   label: 'chroma (expected)'},
  {value: 'meaChroma',   label: 'chroma (measured)'},
  {value: 'expHue',      label: 'hue angle (expected, 10° bins)'},
  {value: 'meaHue',      label: 'hue angle (measured, 10° bins)'},
  {value: 'page',        label: 'card'},
  {value: 'format',      label: 'format (raw / photo)'},
  {value: 'device',      label: 'device'},
  {value: 'bg',          label: 'background paper'},
  // Individual capture (one row per DNG/JPG shot). Useful for spotting
  // "is this drift real across shots or is one bad shot pulling the
  // average" — pair with the fixture multi-select above to focus on a
  // handful of related captures.
  {value: 'fixture',     label: 'fixture (individual photo)'},
  // Shot kind bucket (burst frame index, burstavg synthetic, manual
  // iso/shutter). Orthogonal to fixture — one captureType value bins
  // the same shot kind across every page/device in the batch so you
  // can answer "does burstavg beat a single frame?" or "is manual
  // iso400 worse than auto?" head-to-head.
  {value: 'captureType', label: 'capture type (burst / avg / manual)'},
  // Light-source bucket per fixture (sun / shade / cloudy / led / …),
  // derived by illuminationOf. Same physical chart under different
  // light sits side-by-side; picking this on the row or facet axis
  // lets you see how a light change moves ΔE at the chip level.
  {value: 'illumination', label: 'illumination (sun / shade / …)'},
  // WB anchor split — one row/col per anchor (whibal / greycard /
  // postit / white / self / paper). OVERRIDES the global "First
  // reference" pick for scoring: for each sample, we produce one
  // virtual copy per anchor available on that shot, each with its
  // own WB-corrected measured RGB + ΔE. Lets you see "which anchor
  // wins for this device/scene" as a heatmap. Second-ref is ignored
  // in this mode (each virtual sample uses single-ref gain).
  {value: 'anchor',      label: 'WB anchor (splits sample per ref card)'},
  {value: 'unevenness',  label: 'illum unevenness (2-wide buckets)'},
  {value: 'signal',      label: 'signal (greycard min R/G/B, 0.05 buckets)'},
];

// Signal strength — proxy for "how much light the sensor saw" in
// this shutter. min(raw R, raw G, raw B) from the greycard ref
// specifically catches the "one channel under-exposed" case that
// magnitude-based metrics can hide. Bucketed to 0.05 for facet /
// axis use, and gated by the "min signal" slider. Null when the
// shutter didn't detect greycard (falls out of the sample).
function signalStrengthOf(s) {
  const gc = s.refOptions?.greycard;
  if (!gc) return null;
  const raw = rawOfRef(gc);
  return Math.min(raw[0], raw[1], raw[2]);
}

// Bucket a continuous angle to width-w bands, labelled by the lower
// edge with a trailing '°' so sortAxisValues' leading-numeric prefix
// sort orders '-30°' before '-20°' before '0°' before '10°'.
function bucketAngle(deg, w) {
  const lo = Math.floor(deg / w) * w;
  return lo + '°';
}

// Extract the axis value for one sample. Returns null when the
// sample doesn't have that dimension (e.g. GLEY notation → no
// value/chroma/hue) so the caller can drop it from the bin.
function axisValueOf(s, axis) {
  const exp = parseNotation(s.expected);
  const mea = parseNotation(s.measured);
  switch (axis) {
    case 'page':       return s.page;
    case 'format':     return s.format;
    case 'device':     return s.device;
    case 'bg':         return s.bg;
    case 'fixture':    return s.fixtureLabel;
    case 'captureType':return s.captureType;
    case 'illumination':return s.illumination;
    case 'anchor':     return s.anchor ?? null;
    case 'expValue':   return exp ? exp.value : null;
    case 'meaValue':   return mea ? mea.value : null;
    case 'expChroma':  return exp ? exp.chroma : null;
    case 'meaChroma':  return mea ? mea.chroma : null;
    case 'expHue':     return exp ? bucketAngle(hueAngle(exp.family, exp.step), 10) : null;
    case 'meaHue':     return mea ? bucketAngle(hueAngle(mea.family, mea.step), 10) : null;
    case 'unevenness': {
      // Bucket into width-2 bands so scattered continuous values
      // aggregate into meaningful cells. Null unevenness (RANSAC
      // didn't lock) → dropped from the heatmap. Anything >= 20
      // collapses into the '20+' bucket — beyond the default
      // maxUneven filter the exact value stops mattering.
      const u = s.illumUnevenness;
      if (u == null) return null;
      if (u >= 20) return '20+';
      const lo = Math.floor(u / 2) * 2;
      return lo + '–' + (lo + 2);
    }
    case 'signal': {
      const v = signalStrengthOf(s);
      if (v == null) return null;
      if (v >= 0.35) return '0.35+';
      const lo = Math.floor(v * 20) / 20;
      return lo.toFixed(2) + '–' + (lo + 0.05).toFixed(2);
    }
    default:           return null;
  }
}

function uniqueValues(arr, key) {
  const s = new Set();
  for (const x of arr) if (x[key] != null) s.add(x[key]);
  return Array.from(s).sort();
}
function uniqueTags(arr) {
  const s = new Set();
  for (const x of arr) for (const t of x.tags ?? []) s.add(t);
  return Array.from(s).sort();
}

function makeRadioGroup(el, name, options, currentGetter, onChange) {
  el.innerHTML = '<legend>' + el.querySelector('legend').textContent + '</legend>';
  for (const opt of options) {
    const id = name + '-' + String(opt.value).replace(/[^a-z0-9]/gi, '_');
    const label = document.createElement('label');
    label.innerHTML = '<input type="radio" name="' + name + '" value="' +
      opt.value + '" ' + (currentGetter() === opt.value ? 'checked' : '') +
      '> ' + opt.label;
    el.appendChild(label);
    label.querySelector('input').addEventListener('change', e => {
      onChange(e.target.value); render();
    });
  }
}

function makeCheckGroup(el, options, currentGetter, onToggle) {
  el.innerHTML = '<legend>' + el.querySelector('legend').textContent + '</legend>';
  const current = currentGetter();
  for (const opt of options) {
    const label = document.createElement('label');
    const checked = current.size === 0 || current.has(opt.value) ? 'checked' : '';
    label.innerHTML = '<input type="checkbox" value="' + opt.value + '" ' +
      checked + '> ' + opt.label;
    el.appendChild(label);
    label.querySelector('input').addEventListener('change', e => {
      onToggle(e.target.value, e.target.checked); render();
    });
  }
}

// ---- URL state persistence ---------------------------------------------
// Serialize the parts of state that meaningfully change the view into
// the URL's query string, so a link like ?chart=heatmap&device=iPhone
// &facet=bg&row=value&col=chroma reproduces the same view. Scalars go
// verbatim; Set-valued multi-selects go as comma-separated (empty = no
// filter, i.e. omitted from the URL).

// (state key, URL param name, kind)
const URL_STATE_SPEC = [
  ['chartType',  'chart',  'scalar'],
  ['format',     'format', 'scalar'],
  ['maxUneven',           'uneven',   'scalar'],
  ['maxWorstDe',          'worstde',  'scalar'],
  ['minSignal',           'minsig',   'scalar'],
  ['excludeFlaggedChips', 'exclchip', 'scalar'],
  ['excludeFlaggedCards', 'exclcard', 'scalar'],
  ['facetAxis',  'facet',  'scalar'],
  ['rowAxis',    'row',    'scalar'],
  ['colAxis',    'col',    'scalar'],
  ['metric',       'metric', 'scalar'],
  ['aggFn',        'agg',    'scalar'],
  ['channelSource','chan',   'scalar'],
  ['device',     'device', 'set'],
  ['bg',         'bg',     'set'],
  ['card',       'card',   'set'],
  ['captureType','captype','set'],
  ['illumination','illum','set'],
  ['fixture',    'fixture','set'],
  ['firstRef',   'ref1',   'scalar'],
  ['secondRef',  'ref2',   'scalar'],
  ['reducer',    'reducer','scalar'],
];

function hydrateStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  for (const [key, param, kind] of URL_STATE_SPEC) {
    const raw = params.get(param);
    if (raw === null) continue;
    if (kind === 'set') {
      state[key] = new Set(raw ? raw.split(',') : []);
    } else if (key === 'maxUneven' || key === 'maxWorstDe') {
      const n = parseInt(raw, 10);
      if (!isNaN(n)) state[key] = n;
    } else if (key === 'minSignal') {
      const n = parseFloat(raw);
      if (!isNaN(n)) state[key] = n;
    } else if (key === 'excludeFlaggedChips' || key === 'excludeFlaggedCards') {
      state[key] = raw === 'true' || raw === '1';
    } else {
      state[key] = raw;
    }
  }
}

// Suppress URL writes during initial hydration + control wiring so the
// first render() doesn't rewrite the URL from partially-defaulted
// state. Flipped true at the tail of the init block.
let urlWriteEnabled = false;
function writeStateToUrl() {
  if (!urlWriteEnabled) return;
  const params = new URLSearchParams();
  for (const [key, param, kind] of URL_STATE_SPEC) {
    const v = state[key];
    if (kind === 'set') {
      if (v.size > 0) params.set(param, [...v].join(','));
    } else {
      params.set(param, String(v));
    }
  }
  const qs = params.toString();
  const url = window.location.pathname + (qs ? '?' + qs : '');
  window.history.replaceState(null, '', url);
}

function initControls() {
  // Chart-type radio. When user picks 'heatmap' we hide the polar
  // view-switcher (2D/3D) and show the heatmap axis controls; polar
  // does the reverse.
  makeRadioGroup(
    document.getElementById('ctl-chart-type'), 'chart-type',
    [{value: 'polar',    label: 'polar disks'},
     {value: 'heatmap',  label: 'heatmap'},
     {value: 'bar',      label: 'bar chart'},
     {value: 'xy',       label: 'xy (expected vs measured)'},
     {value: 'channels', label: 'channels (R/G/B expected vs measured)'}],
    () => state.chartType, v => {
      state.chartType = v;
      applyChartTypeVisibility();
    },
  );
  // Heatmap axis + aggregation controls. Bind now so the initial
  // render() sees the defaults; they only appear when chartType
  // = 'heatmap'.
  const facetSel = document.getElementById('heat-facet-axis');
  const rowSel = document.getElementById('heat-row-axis');
  const colSel = document.getElementById('heat-col-axis');
  const metricSel = document.getElementById('heat-metric');
  const aggSel = document.getElementById('heat-agg');
  const chanSrcSel = document.getElementById('heat-chan-src');
  const fillAxisSelect = (sel, current, options) => {
    sel.innerHTML = '';
    for (const opt of options) {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      if (opt.value === current) o.selected = true;
      sel.appendChild(o);
    }
  };
  // Facet has an extra "all" pseudo-value that means "one heatmap
  // for the whole filtered set". Rows/cols reuse the plain axis list.
  const facetOptions = [{value: 'all', label: '(single heatmap)'}, ...HEATMAP_AXIS_OPTIONS];
  fillAxisSelect(facetSel, state.facetAxis, facetOptions);
  fillAxisSelect(rowSel, state.rowAxis, HEATMAP_AXIS_OPTIONS);
  fillAxisSelect(colSel, state.colAxis, HEATMAP_AXIS_OPTIONS);
  metricSel.value = state.metric;
  aggSel.value = state.aggFn;
  chanSrcSel.value = state.channelSource;
  facetSel.addEventListener('change', e => { state.facetAxis = e.target.value; render(); });
  rowSel.addEventListener('change', e => { state.rowAxis = e.target.value; render(); });
  colSel.addEventListener('change', e => { state.colAxis = e.target.value; render(); });
  metricSel.addEventListener('change', e => { state.metric = e.target.value; render(); });
  aggSel.addEventListener('change', e => { state.aggFn = e.target.value; render(); });
  chanSrcSel.addEventListener('change', e => { state.channelSource = e.target.value; render(); });

  makeRadioGroup(
    document.getElementById('ctl-format'), 'format',
    [{value: 'all', label: 'all'},
     {value: 'raw', label: 'raw (DNG)'},
     {value: 'photo', label: 'jpeg (JPEG)'}],
    () => state.format,
    v => { state.format = v; rebuildFixtureControl(); },
  );
  makeRadioGroup(
    document.getElementById('ctl-reducer'), 'reducer',
    [{value: 'mean', label: 'mean (per-channel average)'},
     {value: 'dominant', label: 'dominant (median-cut biggest cluster)'}],
    () => state.reducer,
    v => { state.reducer = v; },
  );
  // Multi-select filters. Empty set = no filter (all pass). On first
  // uncheck we expand the set to the full list so the box we just
  // unchecked is actually removed; on re-check-of-all we collapse
  // back to empty so filterSamples() short-circuits.
  const bindMultiSelect = (elId, key, all, afterToggle) => {
    makeCheckGroup(
      document.getElementById(elId),
      all.map(v => ({value: v, label: v})),
      () => state[key],
      (v, on) => {
        if (state[key].size === 0) for (const x of all) state[key].add(x);
        if (on) state[key].add(v); else state[key].delete(v);
        if (state[key].size === all.length) state[key].clear();
        if (afterToggle) afterToggle();
      },
    );
  };
  // device / bg / card toggles narrow the fixture list (implemented
  // by rebuildFixtureControl below). Rebuild after each toggle so
  // the picker never shows fixtures that don't match current primary
  // filters.
  bindMultiSelect('ctl-device', 'device', uniqueValues(SAMPLES, 'device'),
    () => rebuildFixtureControl());
  bindMultiSelect('ctl-bg',     'bg',     uniqueValues(SAMPLES, 'bg'),
    () => rebuildFixtureControl());
  bindMultiSelect('ctl-card',   'card',   uniqueValues(SAMPLES, 'page'),
    () => rebuildFixtureControl());
  bindMultiSelect('ctl-capture-type', 'captureType',
    uniqueValues(SAMPLES, 'captureType'),
    () => rebuildFixtureControl());
  bindMultiSelect('ctl-illumination', 'illumination',
    uniqueValues(SAMPLES, 'illumination'),
    () => rebuildFixtureControl());

  // Fixture picker. Options list is dynamically reduced to fixtures
  // matching current device / bg / card / format filters. Rebuilt on
  // every primary-filter change (above). Also cleared of stale
  // entries (fixtures no longer in the reduced list) each rebuild so
  // narrowing the primary filters doesn't leave a fixture selection
  // that filters to zero. Uses a bounded-height scroll box for the
  // rare case of a wide dataset with many matching fixtures.
  function rebuildFixtureControl() {
    const el = document.getElementById('ctl-fixture');
    if (!el) return;
    const allowed = new Set();
    for (const s of SAMPLES) {
      if (state.format !== 'all' && s.format !== state.format) continue;
      if (state.device.size > 0 && !state.device.has(s.device)) continue;
      if (state.bg.size > 0     && !state.bg.has(s.bg))         continue;
      if (state.card.size > 0   && !state.card.has(s.page))     continue;
      if (state.captureType.size > 0 &&
          !state.captureType.has(s.captureType)) continue;
      if (state.illumination.size > 0 &&
          !state.illumination.has(s.illumination)) continue;
      allowed.add(s.fixtureLabel);
    }
    const opts = [...allowed].sort();
    // Purge stale fixture selections.
    for (const chosen of [...state.fixture]) {
      if (!allowed.has(chosen)) state.fixture.delete(chosen);
    }
    const legend = el.querySelector('legend').textContent;
    if (opts.length === 0) {
      el.innerHTML = '<legend>' + legend + '</legend>' +
        '<div style="font-size:11px;color:#888">' +
        'No fixtures match the current primary filters.</div>';
      return;
    }
    const showCount = ' <span style="font-weight:400;color:#888;font-size:11px">(' +
      opts.length + ' available)</span>';
    let html = '<legend>' + legend + showCount + '</legend>' +
      '<div style="max-height:200px; overflow-y:auto; padding-right:6px;">';
    const current = state.fixture;
    for (const opt of opts) {
      const checked = current.size === 0 || current.has(opt) ? 'checked' : '';
      const id = 'fixt_' + opt.replace(/[^a-z0-9]/gi, '_');
      html += '<label style="font-size:11px; word-break:break-all;">' +
        '<input type="checkbox" data-fixture="' + opt + '" ' + checked + '> ' +
        opt + '</label>';
    }
    html += '</div>';
    el.innerHTML = html;
    el.querySelectorAll('input[data-fixture]').forEach(inp => {
      inp.addEventListener('change', e => {
        const v = e.target.dataset.fixture;
        if (state.fixture.size === 0) for (const x of opts) state.fixture.add(x);
        if (e.target.checked) state.fixture.add(v); else state.fixture.delete(v);
        if (state.fixture.size === opts.length) state.fixture.clear();
        render();
      });
    });
  }
  rebuildFixtureControl();

  // First / second reference pickers. Options are the union of ref
  // cards actually present in the loaded samples (usually {whibal,
  // postit, greycard}). Second-ref option list re-renders whenever
  // the first-ref choice changes, so the current first choice is
  // excluded from second's options. Picking a second ref that would
  // duplicate the first auto-resets second to 'none'.
  const refOptionSet = new Set();
  for (const s of SAMPLES) {
    for (const k of Object.keys(s.refOptions)) refOptionSet.add(k);
  }
  const refOpts = Array.from(refOptionSet).sort();
  const rebuildRefControls = () => {
    makeRadioGroup(
      document.getElementById('ctl-first-ref'), 'first-ref',
      refOpts.map(v => ({value: v, label: v})),
      () => state.firstRef,
      v => {
        state.firstRef = v;
        if (state.secondRef === v) state.secondRef = 'none';
        rebuildRefControls();
      },
    );
    const secondOpts = [{value: 'none', label: 'none (single-ref)'}]
      .concat(refOpts.filter(v => v !== state.firstRef).map(v => ({value: v, label: v})));
    makeRadioGroup(
      document.getElementById('ctl-second-ref'), 'second-ref',
      secondOpts,
      () => state.secondRef,
      v => { state.secondRef = v; },
    );
  };
  rebuildRefControls();

  // Tuned 3×3 CCM controls (experimental). Fit uses the sample set
  // AFTER primary filters but BEFORE the CCM-apply switch, so users
  // narrow to (device × bg × card) first and get a scenario-specific
  // matrix. Never persisted to URL — always a fresh fit each session.
  const ccmFitBtn = document.getElementById('ccm-fit-btn');
  const ccmApplyToggle = document.getElementById('ccm-apply-toggle');
  const ccmClearBtn = document.getElementById('ccm-clear-btn');
  const ccmVizEl = document.getElementById('ccm-viz');
  function refreshCcmUi() {
    ccmApplyToggle.checked = state.ccmApplied;
    ccmApplyToggle.disabled = state.ccm == null;
    ccmVizEl.innerHTML = renderCcmViz(state.ccm);
  }
  ccmFitBtn.addEventListener('click', () => {
    // Build the training pool: same primary filters as filterSamples,
    // but pulling BOTH chart chips (from Sample.rawRgb/expectedRgb)
    // AND per-shot ref cards (from Sample.refOptions). Refs cards
    // give the fit a stronger neutral anchor. Skip anything without
    // real expected/raw values.
    const pairs = [];
    const seenRefKey = new Set();
    for (const s of SAMPLES) {
      if (state.format !== 'all' && s.format !== state.format) continue;
      if (state.device.size > 0 && !state.device.has(s.device)) continue;
      if (state.bg.size > 0     && !state.bg.has(s.bg))         continue;
      if (state.card.size > 0   && !state.card.has(s.page))     continue;
      if (state.captureType.size > 0 &&
          !state.captureType.has(s.captureType)) continue;
      if (state.illumination.size > 0 &&
          !state.illumination.has(s.illumination)) continue;
      if (state.fixture.size > 0 && !state.fixture.has(s.fixtureLabel)) continue;
      if (state.excludeFlaggedChips && EXCLUDED_CHIPS.has(s.expected)) continue;
      if (state.excludeFlaggedCards && EXCLUDED_CARDS.has(s.fixtureLabel)) continue;
      pairs.push({raw: rawOfSample(s), expected: s.expectedRgb});
      // Add each shot's ref cards, deduped by (shot × card).
      for (const [name, ref] of Object.entries(s.refOptions)) {
        const key = s.fixtureLabel + '|' + s.format + '|' + name;
        if (seenRefKey.has(key)) continue;
        seenRefKey.add(key);
        pairs.push({raw: rawOfRef(ref), expected: ref.expected});
      }
    }
    if (pairs.length < 4) {
      alert('Not enough samples to fit a 3×3 CCM (need >= 4, have ' +
            pairs.length + '). Widen the filters.');
      return;
    }
    try {
      const fit = fitCCM(pairs);
      if (fit == null) throw new Error('fitCCM returned null');
      state.ccm = fit;
      state.ccmApplied = true;
      refreshCcmUi();
      render();
    } catch (e) {
      alert('CCM fit failed: ' + e.message);
    }
  });
  ccmApplyToggle.addEventListener('change', e => {
    state.ccmApplied = e.target.checked;
    render();
  });
  ccmClearBtn.addEventListener('click', () => {
    state.ccm = null;
    state.ccmApplied = false;
    refreshCcmUi();
    render();
  });
  refreshCcmUi();

  // Illumination-unevenness slider. Range 0..100 with a max-position
  // treated as "no filter" (so users don't have to know that "999
  // means all"). Live value shown next to the slider.
  const unevenEl = document.getElementById('ctl-uneven');
  unevenEl.innerHTML =
    '<legend>' + unevenEl.querySelector('legend').textContent + '</legend>' +
    '<label style="min-width:200px">' +
    '  <input type="range" id="uneven-slider" min="0" max="100" step="1" ' +
    '   value="' + state.maxUneven + '" style="width:150px; vertical-align:middle">' +
    '  <span id="uneven-val" style="display:inline-block; min-width:36px; ' +
    '   text-align:right; font-variant-numeric:tabular-nums">' + state.maxUneven +
    '</span>' +
    '</label>' +
    '<div style="font-size:11px; color:#888; margin-top:2px">' +
    '  Hide samples from captures with unevenness &gt; slider. ' +
    '  100 = show all.' +
    '</div>';
  const slider = document.getElementById('uneven-slider');
  const label = document.getElementById('uneven-val');
  slider.addEventListener('input', e => {
    state.maxUneven = parseInt(e.target.value, 10);
    label.textContent = state.maxUneven === 100 ? 'all' : state.maxUneven;
    render();
  });

  // Max fixture-worst-ΔE slider. Fixture-level filter: drop every
  // cell of a shutter × format whose max-per-cell ΔE exceeds this
  // (the same "worst ΔE" column shown in the run.html greycard
  // ranking table). Range 0..50; 50 = show everything.
  const worstEl = document.getElementById('ctl-worst-de');
  worstEl.innerHTML =
    '<legend>' + worstEl.querySelector('legend').textContent + '</legend>' +
    '<label style="min-width:200px">' +
    '  <input type="range" id="worst-de-slider" min="1" max="50" step="1" ' +
    '   value="' + state.maxWorstDe + '" style="width:150px; vertical-align:middle">' +
    '  <span id="worst-de-val" style="display:inline-block; min-width:36px; ' +
    '   text-align:right; font-variant-numeric:tabular-nums">' + state.maxWorstDe +
    '</span>' +
    '</label>' +
    '<div style="font-size:11px; color:#888; margin-top:2px">' +
    '  Hide entire fixtures whose worst per-cell ΔE &gt; slider. ' +
    '  50 = show all.' +
    '</div>';
  const worstSlider = document.getElementById('worst-de-slider');
  const worstLabel = document.getElementById('worst-de-val');
  worstSlider.addEventListener('input', e => {
    state.maxWorstDe = parseInt(e.target.value, 10);
    worstLabel.textContent = state.maxWorstDe === 50 ? 'all' : state.maxWorstDe;
    render();
  });

  // Min signal-strength slider. Step 0.01 so users can dial in the
  // boundary near the noise floor (~0.05–0.10). 0 = show all.
  const signalEl = document.getElementById('ctl-min-signal');
  signalEl.innerHTML =
    '<legend>' + signalEl.querySelector('legend').textContent + '</legend>' +
    '<label style="min-width:200px">' +
    '  <input type="range" id="min-signal-slider" min="0" max="0.35" step="0.01" ' +
    '   value="' + state.minSignal + '" style="width:150px; vertical-align:middle">' +
    '  <span id="min-signal-val" style="display:inline-block; min-width:40px; ' +
    '   text-align:right; font-variant-numeric:tabular-nums">' +
    state.minSignal.toFixed(2) + '</span>' +
    '</label>' +
    '<div style="font-size:11px; color:#888; margin-top:2px">' +
    '  Hide fixtures whose greycard raw min(R,G,B) &lt; slider. ' +
    '  Nominal well-lit ≈ 0.15. 0 = show all.' +
    '</div>';
  const signalSlider = document.getElementById('min-signal-slider');
  const signalLabel = document.getElementById('min-signal-val');
  signalSlider.addEventListener('input', e => {
    state.minSignal = parseFloat(e.target.value);
    signalLabel.textContent = state.minSignal.toFixed(2);
    render();
  });

  // Excluded-chips filter. Single checkbox; disabled with an
  // informative note when the exclusion list is empty (nothing to
  // hide, so the control is a no-op).
  const excludedEl = document.getElementById('ctl-excluded');
  const listHtml = EXCLUDED_CHIPS.size === 0
    ? '<div style="font-size:11px;color:#888">' +
        'No chips flagged. Edit <code>scripts/excluded-chips.json</code> ' +
        'and rerun analyze-fixtures.</div>'
    : '<label><input type="checkbox" id="excluded-toggle" ' +
        (state.excludeFlaggedChips ? 'checked' : '') + '>' +
        ' Exclude ' + EXCLUDED_CHIPS.size + ' flagged chip' +
        (EXCLUDED_CHIPS.size === 1 ? '' : 's') + '</label>' +
        '<div style="font-size:11px; color:#888; margin-top:2px">' +
        [...EXCLUDED_CHIPS].map(n => '<code>' + n + '</code>').join(', ') +
        '</div>';
  excludedEl.innerHTML =
    '<legend>' + excludedEl.querySelector('legend').textContent + '</legend>' +
    listHtml;
  const excludedToggle = document.getElementById('excluded-toggle');
  if (excludedToggle) {
    excludedToggle.addEventListener('change', e => {
      state.excludeFlaggedChips = e.target.checked;
      render();
    });
  }

  // Excluded-cards checkbox. Same "empty list → informative note"
  // shape as excluded-chips. Truncates the list preview at 8 entries
  // to avoid a huge wall of text when the exclusion list grows.
  const excludedCardsEl = document.getElementById('ctl-excluded-cards');
  const cardsList = [...EXCLUDED_CARDS];
  const cardsPreview = cardsList.length <= 8
    ? cardsList
    : cardsList.slice(0, 8).concat(['+ ' + (cardsList.length - 8) + ' more']);
  const cardsListHtml = EXCLUDED_CARDS.size === 0
    ? '<div style="font-size:11px;color:#888">' +
        'No fixtures flagged. Edit <code>scripts/excluded-cards.json</code> ' +
        'and rerun analyze-fixtures.</div>'
    : '<label><input type="checkbox" id="excluded-cards-toggle" ' +
        (state.excludeFlaggedCards ? 'checked' : '') + '>' +
        ' Exclude ' + EXCLUDED_CARDS.size + ' flagged fixture' +
        (EXCLUDED_CARDS.size === 1 ? '' : 's') + '</label>' +
        '<div style="font-size:11px; color:#888; margin-top:2px; ' +
        'word-break:break-all;">' +
        cardsPreview.map(n => '<code>' + n + '</code>').join(', ') +
        '</div>';
  excludedCardsEl.innerHTML =
    '<legend>' + excludedCardsEl.querySelector('legend').textContent + '</legend>' +
    cardsListHtml;
  const excludedCardsToggle = document.getElementById('excluded-cards-toggle');
  if (excludedCardsToggle) {
    excludedCardsToggle.addEventListener('change', e => {
      state.excludeFlaggedCards = e.target.checked;
      render();
    });
  }
}

// Returns the filtered samples with WB-derived fields recomputed
// from the currently-selected first / second refs:
//   .measured        — nearest chip's notation (client-side lookup)
//   .measuredRgb     — post-WB linear-sRGB
//   .deltaE          — ΔE2000 between measured and expected in Lab
// The three fields let downstream charts (polar, heatmap, bar, xy,
// channels) all reflect the user's WB choice with no per-chart
// changes. Samples whose parent shot lacks the picked ref card(s)
// are dropped from the returned list.
function filterSamples() {
  const uMax = state.maxUneven === 100 ? Infinity : state.maxUneven;
  const worstMax = state.maxWorstDe >= 50 ? Infinity : state.maxWorstDe;
  const excludeFlagged = state.excludeFlaggedChips && EXCLUDED_CHIPS.size > 0;
  const excludeFlaggedFixtures =
    state.excludeFlaggedCards && EXCLUDED_CARDS.size > 0;
  const {firstRef, secondRef} = state;
  // Anchor-splitting mode: when any of facet/row/col is set to
  // 'anchor', we expand each sample into ONE virtual sample per anchor
  // present in that shot's refOptions (self, whibal, postit, greycard,
  // white, paper — whatever's there). Each virtual sample gets its
  // own single-ref WB applied. Second-ref is ignored in this mode.
  // This lets a heatmap show "which anchor is best per (row, col)".
  const splitByAnchor =
    state.facetAxis === 'anchor' ||
    state.rowAxis === 'anchor' ||
    state.colAxis === 'anchor';

  // First pass — apply per-sample filters (format, device, bg, card,
  // uneven), recompute WB-derived measured / ΔE. Skip excluded-chip
  // samples HERE (before the worst-ΔE stat) so a defective chip's
  // high ΔE doesn't disqualify the whole fixture. Stash for
  // the second pass.
  const passed = [];
  for (const s of SAMPLES) {
    if (state.format !== 'all' && s.format !== state.format) continue;
    if (state.device.size > 0 && !state.device.has(s.device)) continue;
    if (state.bg.size > 0     && !state.bg.has(s.bg))         continue;
    if (state.card.size > 0   && !state.card.has(s.page))     continue;
    if (state.captureType.size > 0 &&
        !state.captureType.has(s.captureType)) continue;
    if (state.illumination.size > 0 &&
        !state.illumination.has(s.illumination)) continue;
    if (state.fixture.size > 0 && !state.fixture.has(s.fixtureLabel)) continue;
    if (s.illumUnevenness !== null && s.illumUnevenness > uMax) continue;
    if (state.minSignal > 0) {
      const sig = signalStrengthOf(s);
      if (sig == null || sig < state.minSignal) continue;
    }
    if (excludeFlagged && EXCLUDED_CHIPS.has(s.expected)) continue;
    if (excludeFlaggedFixtures && EXCLUDED_CARDS.has(s.fixtureLabel)) continue;

    const rawIn = rawOfSample(s);
    if (state.ccmApplied && state.ccm) {
      // CCM path: no anchor, no WB. Always one copy per sample even
      // in split mode — anchor axis is meaningless when CCM is in
      // effect (measurement doesn't depend on anchor choice).
      const measuredRgb = applyCCM(rawIn, state.ccm.matrix);
      const measured = nearestChipNotation(measuredRgb);
      const deltaE = deltaE2000(rgbToLab(measuredRgb), rgbToLab(s.expectedRgb));
      passed.push({...s, measured, measuredRgb, deltaE, anchor: 'ccm'});
      continue;
    }
    if (splitByAnchor) {
      // Emit one virtual sample per available anchor on this shot.
      // Second-ref intentionally 'none' — the point of this mode is
      // to compare anchors individually.
      for (const name of Object.keys(s.refOptions)) {
        const wb = computeWB(s.refOptions, name, 'none');
        if (!wb) continue;
        const measuredRgb = applyWB(rawIn, wb);
        const measured = nearestChipNotation(measuredRgb);
        const deltaE = deltaE2000(rgbToLab(measuredRgb), rgbToLab(s.expectedRgb));
        passed.push({...s, measured, measuredRgb, deltaE, anchor: name});
      }
    } else {
      const wb = computeWB(s.refOptions, firstRef, secondRef);
      if (!wb) continue;
      const measuredRgb = applyWB(rawIn, wb);
      const measured = nearestChipNotation(measuredRgb);
      const deltaE = deltaE2000(rgbToLab(measuredRgb), rgbToLab(s.expectedRgb));
      passed.push({...s, measured, measuredRgb, deltaE, anchor: firstRef});
    }
  }

  // Second pass — worst-ΔE-per-fixture gate. Key by fixtureLabel +
  // format (a shutter × format); each such fixture's max ΔE across
  // its cells is compared against the slider. All cells of an
  // exceeding fixture are dropped.
  if (worstMax === Infinity) return passed;
  const worstByFixture = new Map();
  for (const s of passed) {
    const k = s.fixtureLabel + '|' + s.format;
    const prev = worstByFixture.get(k) ?? 0;
    if (s.deltaE > prev) worstByFixture.set(k, s.deltaE);
  }
  return passed.filter(s => {
    const k = s.fixtureLabel + '|' + s.format;
    return (worstByFixture.get(k) ?? 0) <= worstMax;
  });
}

// ---- Rendering ----------------------------------------------------------

// One SVG per ground-truth VALUE bin. Chips laid out as a background
// lattice at (hueAngle, chroma); samples grouped by chip, mean arrow
// per chip drawn from expected → measured with color = ΔValue.
function renderDisk(valueBin, valueSamples) {
  // Which chips belong to this value bin? Everything in CHIPS whose
  // value matches (within 0.25 to catch 2 vs 2.5 bins etc.).
  const binChips = CHIPS.filter(c => Math.abs(c.value - valueBin) < 0.25);

  // SVG geometry. Wedge occupies the top of the disk (angle 0 = 12
  // o'clock, span ±WEDGE_MAX), so the visible pixels sit *above* the
  // centre. Place centre near the bottom of the viewport with just
  // enough room below for the "chroma →" pointer.
  const SIZE_W = 520;
  const SIZE_H = 310;
  const CX = SIZE_W / 2;
  const CY = 280;
  const MAX_CHROMA = 8;
  const R_PER_CHROMA = 30; // 8 chroma × 30 = 240px radius

  // Soil wedge: 5R to 5GY. In our anchor (10YR at 0°): 5R = -54°,
  // 10R = -36°, 5YR = -18°, 10YR = 0°, 5Y = +18°, 10Y = +36°,
  // 5GY = +54°. Plus a bit of margin on each side.
  const WEDGE_MIN = -65;
  const WEDGE_MAX = 65;

  const parts = [];

  // Concentric chroma gridlines. Standard soil-chart chromas are
  // {1, 2, 3, 4, 6, 8} — /5 and /7 don't appear on any card. Label
  // every ring at both ends of the wedge so the user can read chroma
  // from either side.
  const CHROMA_RINGS = [1, 2, 3, 4, 6, 8];
  for (const c of CHROMA_RINGS) {
    const r = c * R_PER_CHROMA;
    // Even chromas get a darker ring so /2, /4 read as anchor rings
    // and /1, /3 as intermediate steps.
    const isEven = c % 2 === 0;
    const p0 = polarToXY(CX, CY, r, WEDGE_MIN);
    const p1 = polarToXY(CX, CY, r, WEDGE_MAX);
    parts.push('<path d="M ' + p0.x + ' ' + p0.y +
      ' A ' + r + ' ' + r + ' 0 0 1 ' + p1.x + ' ' + p1.y + '"' +
      ' fill="none" stroke="' + (isEven ? '#b8b8b8' : '#dadada') +
      '" stroke-width="' + (isEven ? 1.5 : 1) + '"/>');
    // Chroma label at both ends of the arc (mirrored).
    const lpR = polarToXY(CX, CY, r, WEDGE_MAX + 2);
    parts.push('<text x="' + lpR.x + '" y="' + lpR.y +
      '" font-size="10" font-weight="bold" fill="#666" ' +
      'text-anchor="start" alignment-baseline="middle">/' + c + '</text>');
    const lpL = polarToXY(CX, CY, r, WEDGE_MIN - 2);
    parts.push('<text x="' + lpL.x + '" y="' + lpL.y +
      '" font-size="10" font-weight="bold" fill="#666" ' +
      'text-anchor="end" alignment-baseline="middle">/' + c + '</text>');
  }

  // Radial hue gridlines every 2.5-hue step in the wedge (matches
  // real chip spacing). Faint by default; the labelled steps get a
  // darker tick.
  for (let a = Math.ceil(WEDGE_MIN / 9) * 9; a <= WEDGE_MAX; a += 9) {
    const p1 = polarToXY(CX, CY, MAX_CHROMA * R_PER_CHROMA, a);
    parts.push('<line x1="' + CX + '" y1="' + CY + '" x2="' + p1.x + '" y2="' + p1.y +
      '" stroke="#eee" stroke-width="0.5"/>');
  }

  // Hue labels at outer arc — every 2.5-step hue that appears on any
  // soil page. The whole ring is labelled so the user can read
  // predicted-vs-expected hue directly off the wedge.
  const HUE_LABELS = [
    {name: '5R',    family: 'R',  step: 5},
    {name: '7.5R',  family: 'R',  step: 7.5},
    {name: '10R',   family: 'R',  step: 10},
    {name: '2.5YR', family: 'YR', step: 2.5},
    {name: '5YR',   family: 'YR', step: 5},
    {name: '7.5YR', family: 'YR', step: 7.5},
    {name: '10YR',  family: 'YR', step: 10},
    {name: '2.5Y',  family: 'Y',  step: 2.5},
    {name: '5Y',    family: 'Y',  step: 5},
    {name: '7.5Y',  family: 'Y',  step: 7.5},
    {name: '10Y',   family: 'Y',  step: 10},
    {name: '2.5GY', family: 'GY', step: 2.5},
    {name: '5GY',   family: 'GY', step: 5},
  ];
  for (const h of HUE_LABELS) {
    const a = hueAngle(h.family, h.step);
    if (a < WEDGE_MIN || a > WEDGE_MAX) continue;
    // Short tick at the outer arc so labels line up with a visible
    // radial mark on the wedge boundary.
    const tickIn = polarToXY(CX, CY, MAX_CHROMA * R_PER_CHROMA, a);
    const tickOut = polarToXY(CX, CY, MAX_CHROMA * R_PER_CHROMA + 4, a);
    parts.push('<line x1="' + tickIn.x + '" y1="' + tickIn.y +
      '" x2="' + tickOut.x + '" y2="' + tickOut.y +
      '" stroke="#888" stroke-width="1"/>');
    // Label position further out; rotate text along the radial so
    // adjacent labels don't overlap in the crowded top of the arc.
    const lp = polarToXY(CX, CY, MAX_CHROMA * R_PER_CHROMA + 16, a);
    parts.push('<text x="' + lp.x + '" y="' + lp.y +
      '" font-size="10" font-weight="bold" fill="#444" ' +
      'text-anchor="middle" alignment-baseline="middle" ' +
      'transform="rotate(' + a + ' ' + lp.x + ' ' + lp.y + ')">' +
      h.name + '</text>');
  }

  // Diagonal "chroma →" pointer *parallel* to the /N label column:
  // same POINTER_ANGLE as the labels (WEDGE_MAX + 2°), then shifted
  // perpendicularly outward by CHROMA_ARROW_OFFSET so the arrow sits
  // below/outside the labels. Reader's eye scans /1 → /8 down the
  // label column; the arrow runs on the parallel just outside it,
  // labelled "chroma".
  {
    const POINTER_ANGLE = WEDGE_MAX + 2;
    const START_R = 90;             // past /3
    const END_R = MAX_CHROMA * R_PER_CHROMA + 14; // just past /8
    const CHROMA_ARROW_OFFSET = 26; // perpendicular pixels outward
    const TEXT_OFFSET = 15;         // further perpendicular for the label
    const angRad = (POINTER_ANGLE * Math.PI) / 180;
    // Radial-outward unit vector at POINTER_ANGLE (in SVG coords).
    const ux = Math.sin(angRad);
    const uy = -Math.cos(angRad);
    // Perpendicular pointing outward-below the label column (rotate
    // radial 90° CW in SVG coord system).
    const px = -uy;
    const py = ux;
    const p0x = CX + START_R * ux + CHROMA_ARROW_OFFSET * px;
    const p0y = CY + START_R * uy + CHROMA_ARROW_OFFSET * py;
    const p1x = CX + END_R * ux + CHROMA_ARROW_OFFSET * px;
    const p1y = CY + END_R * uy + CHROMA_ARROW_OFFSET * py;
    const ang = Math.atan2(p1y - p0y, p1x - p0x);
    const AH = 8;
    const ax1 = p1x - AH * Math.cos(ang - 0.4);
    const ay1 = p1y - AH * Math.sin(ang - 0.4);
    const ax2 = p1x - AH * Math.cos(ang + 0.4);
    const ay2 = p1y - AH * Math.sin(ang + 0.4);
    parts.push('<line x1="' + p0x + '" y1="' + p0y +
      '" x2="' + p1x + '" y2="' + p1y +
      '" stroke="#555" stroke-width="1.5" stroke-dasharray="4 2"/>');
    parts.push('<polygon points="' + p1x + ',' + p1y + ' ' +
      ax1 + ',' + ay1 + ' ' + ax2 + ',' + ay2 +
      '" fill="#555"/>');
    // "chroma" label centred along the arrow, rotated to match its
    // angle, offset further perpendicular so it sits below the shaft.
    const midx = (p0x + p1x) / 2 + TEXT_OFFSET * px;
    const midy = (p0y + p1y) / 2 + TEXT_OFFSET * py;
    const rotDeg = (ang * 180) / Math.PI;
    parts.push('<text x="' + midx + '" y="' + midy +
      '" font-size="11" font-weight="bold" fill="#555" ' +
      'text-anchor="middle" alignment-baseline="middle" ' +
      'transform="rotate(' + rotDeg + ' ' + midx + ' ' + midy + ')">' +
      'chroma</text>');
  }

  // Chip lattice dots — computed here but appended to parts AFTER
  // the arrows so each arrow's tail is capped by a visible chip in
  // the chip's own color ("started at this color → moved this way").
  const chipDots = [];
  const sampledNotations = new Set(); // chips with at least one sample in this bin
  for (const chip of binChips) {
    let angle, r;
    if (chip.hue === 'N') { angle = 0; r = 0; }
    else {
      const fam = chip.hue.replace(/^\\d+(?:\\.\\d+)?/, '');
      const stp = parseFloat(chip.hue) || 10;
      angle = hueAngle(fam, stp);
      r = chip.chroma * R_PER_CHROMA;
    }
    if (angle < WEDGE_MIN - 3 || angle > WEDGE_MAX + 3) continue;
    const p = polarToXY(CX, CY, r, angle);
    chipDots.push({
      x: p.x, y: p.y, notation: chip.notation, hex: rgbHex(chip.rgb),
    });
  }

  // Group samples by expected chip (notation).
  const byChip = new Map();
  for (const s of valueSamples) {
    const key = s.expected;
    if (!byChip.has(key)) byChip.set(key, []);
    byChip.get(key).push(s);
  }

  // Per-chip mean arrow (mean of expected→measured vectors, mean ΔValue).
  let nArrows = 0;
  let nSkippedOutOfWedge = 0;
  for (const [notation, group] of byChip) {
    const exp = parseNotation(notation);
    if (!exp) continue;
    // Skip expected chips outside the soil wedge (GLEY blues/greens
    // at 10B, 5PB, etc.). Their lattice dot isn't drawn either — the
    // arrow would be a ghost with no origin chip. Report the count in
    // the panel title so the reader knows we hid them.
    const expAngleCheck =
      exp.family === 'N' ? 0 : hueAngle(exp.family, exp.step);
    if (exp.family !== 'N' &&
        (expAngleCheck < WEDGE_MIN - 3 || expAngleCheck > WEDGE_MAX + 3)) {
      nSkippedOutOfWedge += group.length;
      continue;
    }
    sampledNotations.add(notation);
    const expAngle = hueAngle(exp.family, exp.step);
    for (const s of group) {
      const mea = parseNotation(s.measured);
      if (!mea) continue;
      const meaAngle = hueAngle(mea.family, mea.step);
      // Signed angular delta, clipped to [-180, 180].
      let dA = meaAngle - expAngle;
      while (dA > 180) dA -= 360;
      while (dA < -180) dA += 360;
      const dV = mea.value - exp.value;
      const p0 = polarToXY(CX, CY, exp.chroma * R_PER_CHROMA, expAngle);
      // Clamp endpoint so it stays inside the visible disk:
      // chroma ∈ [0, MAX_CHROMA + 0.5] prevents polarToXY from
      // flipping through the origin at extreme values; angle stays
      // inside the wedge.
      const rawR = Math.max(0,
        Math.min(MAX_CHROMA + 0.5, mea.chroma)) * R_PER_CHROMA;
      const rawAngle = Math.max(WEDGE_MIN,
        Math.min(WEDGE_MAX, expAngle + dA));
      const p1 = polarToXY(CX, CY, rawR, rawAngle);
      parts.push('<line x1="' + p0.x + '" y1="' + p0.y +
        '" x2="' + p1.x + '" y2="' + p1.y +
        '" stroke="' + deltaValueColor(dV) +
        '" stroke-width="2" opacity="0.7"/>');
      nArrows++;
    }
  }

  // Chip lattice on TOP of arrows. Sampled chips (those an arrow
  // starts from) get a slightly larger radius + dark outline so the
  // arrow origin is unambiguous and the chip's true colour shows.
  // data-notation carries the Munsell notation for the shared hover
  // tooltip (see setup2DChipHover).
  for (const dot of chipDots) {
    const sampled = sampledNotations.has(dot.notation);
    const r = sampled ? 6 : 4.5;
    const stroke = sampled ? '#222' : '#bbb';
    const strokeW = sampled ? 1.2 : 0.5;
    parts.push('<circle cx="' + dot.x + '" cy="' + dot.y +
      '" r="' + r + '" fill="' + dot.hex +
      '" stroke="' + stroke + '" stroke-width="' + strokeW +
      '" data-notation="' + dot.notation.replace(/&/g, '&amp;').replace(/"/g, '&quot;') +
      '"/>');
  }

  return {
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="' + SIZE_W +
         '" height="' + SIZE_H + '" viewBox="0 0 ' + SIZE_W + ' ' +
         SIZE_H + '">' + parts.join('') + '</svg>',
    nArrows,
    nChips: binChips.length,
    nSkippedOutOfWedge,
  };
}

function renderPolar(filtered) {
  const summary = document.getElementById('summary');
  const {facetAxis} = state;

  // Partition samples by facet (single group when facet='all').
  const facetGroups = new Map();
  if (facetAxis === 'all') {
    facetGroups.set('(all)', filtered);
  } else {
    for (const s of filtered) {
      const f = axisValueOf(s, facetAxis);
      if (f == null) continue;
      const key = String(f);
      if (!facetGroups.has(key)) facetGroups.set(key, []);
      facetGroups.get(key).push(s);
    }
  }
  const facetKeys = sortAxisValues([...facetGroups.keys()]);

  const strip = document.getElementById('filmstrip');
  strip.innerHTML = '';

  const buildDisksFor = (samples) => {
    const byValue = new Map();
    for (const s of samples) {
      const exp = parseNotation(s.expected);
      if (!exp) continue;
      if (!byValue.has(exp.value)) byValue.set(exp.value, []);
      byValue.get(exp.value).push(s);
    }
    const values = Array.from(byValue.keys()).sort((a, b) => b - a);
    const wrap = document.createElement('div');
    wrap.className = 'polar-row';
    for (const v of values) {
      const vs = byValue.get(v);
      const {svg, nArrows, nSkippedOutOfWedge} = renderDisk(v, vs);
      const div = document.createElement('div');
      div.className = 'disk';
      const skippedTag = nSkippedOutOfWedge > 0
        ? ', skipped ' + nSkippedOutOfWedge + ' GLEY' : '';
      div.innerHTML = '<h3>Value ' + v + '  (n=' + vs.length +
        ', arrows=' + nArrows + skippedTag + ')</h3>' + svg;
      wrap.appendChild(div);
    }
    return {wrap, valueCount: values.length};
  };

  let totalValues = 0;
  for (const k of facetKeys) {
    const samples = facetGroups.get(k);
    const {wrap, valueCount} = buildDisksFor(samples);
    totalValues += valueCount;
    if (facetAxis !== 'all') {
      const header = document.createElement('div');
      header.className = 'polar-facet-title';
      header.innerHTML = escapeHtml(facetAxis) + ' = <b>' + escapeHtml(k) +
        '</b>  <span class="n">(' + samples.length + ' samples · ' +
        valueCount + ' value bins)</span>';
      strip.appendChild(header);
    }
    strip.appendChild(wrap);
  }

  const facetLabel = facetAxis === 'all' ? '' : ' across ' +
    facetKeys.length + ' ' + facetAxis + ' facets';
  summary.textContent = 'showing ' + filtered.length + ' samples' +
    facetLabel + ' (' + totalValues + ' value bins total)';
}

// Numeric-aware axis sort — falls back to string compare when either
// side isn't numeric (e.g. 'raw' vs 'photo'). Also parses a leading
// numeric prefix so bucket labels like '2–4' and '20+' sort by their
// low bound instead of lexicographically ('10–12' < '2–4' would be
// wrong; both parse-float to 10 and 2, which sorts correctly).
function sortAxisValues(arr) {
  return arr.slice().sort((a, b) => {
    const na = Number(a), nb = Number(b);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    const pa = parseFloat(String(a));
    const pb = parseFloat(String(b));
    const pna = isNaN(pa), pnb = isNaN(pb);
    if (!pna && !pnb && pa !== pb) return pa - pb;
    if (pna !== pnb) return pna ? 1 : -1; // put pure-string after numeric-prefixed
    return String(a).localeCompare(String(b));
  });
}

function aggregateNums(vs) {
  if (state.aggFn === 'median') {
    const sorted = vs.slice().sort((a, b) => a - b);
    const m = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[m] : 0.5 * (sorted[m - 1] + sorted[m]);
  }
  return vs.reduce((a, b) => a + b, 0) / vs.length;
}

// Extract the per-sample scalar the heatmap/bar aggregates. Returns
// null when the metric isn't defined for this sample (e.g. GLEY
// notation → no measured value). Callers must skip null.
function metricOf(s, metric) {
  if (metric === 'deltaE') return s.deltaE;
  const mea = parseNotation(s.measured);
  if (!mea) return null;
  if (metric === 'meaValue')    return mea.value;
  if (metric === 'meaChroma')   return mea.chroma;
  if (metric === 'meaHueAngle') return hueAngle(mea.family, mea.step);
  return null;
}

// Per-metric colour scale + display range. Scale is {min, max, ramp}.
// ΔE and measured value/chroma are sequential (min=0). Hue angle is
// diverging around 0° since angles are signed and 0 = perfect for a
// mean-error-in-angle interpretation.
function metricScale(metric) {
  if (metric === 'deltaE')      return {min: 0,   max: 20, label: 'ΔE',                 ramp: rampErr};
  if (metric === 'meaValue')    return {min: 0,   max: 10, label: 'measured value',     ramp: rampTeal};
  if (metric === 'meaChroma')   return {min: 0,   max: 10, label: 'measured chroma',    ramp: rampTeal};
  return                               {min: -90, max: 90, label: 'measured hue angle', ramp: rampDiv};
}
// All ramps take (v, min, max) and normalize the same way so callers
// can hand any metric's scale in without special-casing min.
function normalize(v, min, max) {
  return Math.min(1, Math.max(0, (v - min) / (max - min)));
}
function rampErr(v, min, max) {
  const t = normalize(v, min, max);
  let r, g, b;
  if (t < 0.5) {
    const u = t * 2;
    r = Math.round(60  + (240 - 60)  * u);
    g = Math.round(180 + (220 - 180) * u);
    b = 90;
  } else {
    const u = (t - 0.5) * 2;
    r = Math.round(240 + (200 - 240) * u);
    g = Math.round(220 + (60  - 220) * u);
    b = Math.round(90  + (60  - 90)  * u);
  }
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
function rampTeal(v, min, max) {
  // Light grey (t=0, ~#e8e8e8) → dark teal (t=1, ~#005766).
  const t = normalize(v, min, max);
  const r = Math.round(232 + (0   - 232) * t);
  const g = Math.round(232 + (87  - 232) * t);
  const b = Math.round(232 + (102 - 232) * t);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}
function rampDiv(v, min, max) {
  // Diverging cool → white → warm centred at (min+max)/2. Used for
  // signed metrics (hue angle) where 0 means "correct" and both
  // sides deserve their own colour.
  const mid = (min + max) / 2;
  const half = (max - min) / 2;
  const t = Math.min(1, Math.max(-1, (v - mid) / half));
  const cool = [0x30, 0x60, 0xa8];
  const white = [0xf5, 0xf5, 0xf5];
  const warm = [0xc0, 0x40, 0x30];
  const [a, b] = t < 0 ? [white, cool] : [white, warm];
  const u = Math.abs(t);
  const r = Math.round(a[0] + (b[0] - a[0]) * u);
  const g = Math.round(a[1] + (b[1] - a[1]) * u);
  const bl = Math.round(a[2] + (b[2] - a[2]) * u);
  return 'rgb(' + r + ',' + g + ',' + bl + ')';
}

const escapeHtml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// Build the (r,c) → {vals} table for one subset of samples. Vals
// contain the per-sample values of the currently selected metric;
// samples with a null metric (e.g. GLEY notation on meaValue) are
// dropped from the bin.
function heatmapBins(samples, rowAxis, colAxis, metric) {
  const groups = new Map();
  const rowsSet = new Set();
  const colsSet = new Set();
  for (const s of samples) {
    const r = axisValueOf(s, rowAxis);
    const c = axisValueOf(s, colAxis);
    if (r == null || c == null) continue;
    const m = metricOf(s, metric);
    if (m == null) continue;
    rowsSet.add(r);
    colsSet.add(c);
    const k = String(r) + '||' + String(c);
    let g = groups.get(k);
    if (!g) { g = {r, c, vals: []}; groups.set(k, g); }
    g.vals.push(m);
  }
  return {groups, rows: sortAxisValues([...rowsSet]), cols: sortAxisValues([...colsSet])};
}

// Render a single heatmap table given prebuilt bins and a shared
// colour cap. Returns HTML.
function heatmapTableHtml(bins, rowAxis, colAxis, scale) {
  const {groups, rows, cols} = bins;
  let html = '<table class="heatmap-table"><thead><tr>';
  html += '<th>' + escapeHtml(rowAxis) + ' \\\\ ' + escapeHtml(colAxis) + '</th>';
  for (const c of cols) html += '<th>' + escapeHtml(c) + '</th>';
  html += '</tr></thead><tbody>';
  for (const r of rows) {
    html += '<tr><th>' + escapeHtml(r) + '</th>';
    for (const c of cols) {
      const g = groups.get(String(r) + '||' + String(c));
      if (!g) { html += '<td class="empty">·</td>'; continue; }
      const v = aggregateNums(g.vals);
      const min = Math.min.apply(null, g.vals).toFixed(1);
      const max = Math.max.apply(null, g.vals).toFixed(1);
      html += '<td style="background:' + scale.ramp(v, scale.min, scale.max) + ';" title="' +
        g.vals.length + ' samples · ' + scale.label + ' range ' + min + '–' + max + '">' +
        v.toFixed(1) + '<span class="n">n=' + g.vals.length + '</span></td>';
    }
    html += '</tr>';
  }
  return html + '</tbody></table>';
}

// Heatmap renderer. Groups filtered samples by (rowAxis, colAxis).
// When state.facetAxis !== 'all' we further partition by that
// dimension and emit one heatmap per facet value — all panels share
// the same colour scale (per-metric max) so they're directly
// comparable across facets.
function renderHeatmap(filtered) {
  const {rowAxis, colAxis, facetAxis, metric} = state;
  const scale = metricScale(metric);

  // Partition samples by facet (single group when facet='all').
  const facetGroups = new Map();
  if (facetAxis === 'all') {
    facetGroups.set('(all)', filtered);
  } else {
    for (const s of filtered) {
      const f = axisValueOf(s, facetAxis);
      if (f == null) continue;
      const key = String(f);
      if (!facetGroups.has(key)) facetGroups.set(key, []);
      facetGroups.get(key).push(s);
    }
  }
  const facetKeys = sortAxisValues([...facetGroups.keys()]);

  const panels = facetKeys.map(k => ({
    key: k,
    samples: facetGroups.get(k),
    bins: heatmapBins(facetGroups.get(k), rowAxis, colAxis, metric),
  }));

  const totalCells = panels.reduce((a, p) => a + p.bins.groups.size, 0);
  const body = panels.map(p => {
    const title = facetAxis === 'all'
      ? ''
      : '<div class="heat-facet-title">' + escapeHtml(facetAxis) +
        ' = ' + escapeHtml(p.key) + '  <span class="n">(' +
        p.samples.length + ' samples)</span></div>';
    return '<div class="heat-facet">' + title +
      heatmapTableHtml(p.bins, rowAxis, colAxis, scale) + '</div>';
  }).join('');

  const summary = document.getElementById('summary');
  const aggLabel = state.aggFn === 'median' ? 'median' : 'mean';
  summary.textContent = 'showing ' + filtered.length + ' samples in ' +
    panels.length + ' heatmap' + (panels.length === 1 ? '' : 's') +
    ' (' + totalCells + ' cells total)';
  const facetLabel = facetAxis === 'all' ? '' : ' · facet = ' + facetAxis;
  document.getElementById('heatmap-title').textContent =
    aggLabel + ' ' + scale.label + ' · rows = ' + rowAxis +
    ' · cols = ' + colAxis + facetLabel +
    ' · shared scale ' + scale.min + '–' + scale.max;
  document.getElementById('heatmap-body').innerHTML = body;
}

// Bar chart. Reuses the row-axis picker as its categorical axis. One
// bar per row-axis value, faceted like the heatmap. Bar length + fill
// colour track the selected metric against its per-metric max scale
// (ΔE cap 20, measured value/chroma cap 10) so panels are comparable
// within a metric.
function renderBar(filtered) {
  const {rowAxis, facetAxis, metric} = state;
  const scale = metricScale(metric);

  const facetGroups = new Map();
  if (facetAxis === 'all') {
    facetGroups.set('(all)', filtered);
  } else {
    for (const s of filtered) {
      const f = axisValueOf(s, facetAxis);
      if (f == null) continue;
      const key = String(f);
      if (!facetGroups.has(key)) facetGroups.set(key, []);
      facetGroups.get(key).push(s);
    }
  }
  const facetKeys = sortAxisValues([...facetGroups.keys()]);

  const panels = facetKeys.map(k => {
    const samples = facetGroups.get(k);
    const byRow = new Map();
    for (const s of samples) {
      const r = axisValueOf(s, rowAxis);
      if (r == null) continue;
      const m = metricOf(s, metric);
      if (m == null) continue;
      const rk = String(r);
      let arr = byRow.get(rk);
      if (!arr) { arr = []; byRow.set(rk, arr); }
      arr.push(m);
    }
    const rowKeys = sortAxisValues([...byRow.keys()]);
    const rows = rowKeys.map(rk => {
      const vs = byRow.get(rk);
      return {row: rk, vals: vs, agg: aggregateNums(vs), n: vs.length};
    });
    return {key: k, samples, rows};
  });

  const totalBars = panels.reduce((a, p) => a + p.rows.length, 0);
  const aggLabel = state.aggFn === 'median' ? 'median' : 'mean';

  const body = panels.map(p => {
    const title = facetAxis === 'all'
      ? ''
      : '<div class="heat-facet-title">' + escapeHtml(facetAxis) +
        ' = ' + escapeHtml(p.key) + '  <span class="n">(' +
        p.samples.length + ' samples)</span></div>';
    let rowsHtml = '<table class="bar-table"><thead><tr>' +
      '<th>' + escapeHtml(rowAxis) + '</th>' +
      '<th>' + aggLabel + ' ' + scale.label + '</th>' +
      '</tr></thead><tbody>';
    for (const r of p.rows) {
      const pct = 100 * normalize(r.agg, scale.min, scale.max);
      rowsHtml += '<tr>' +
        '<td class="axis">' + escapeHtml(r.row) +
          '<span class="bar-n">n=' + r.n + '</span></td>' +
        '<td class="bar-cell">' +
          '<div class="bar-track">' +
            '<div class="bar-fill" style="width:' + pct.toFixed(1) +
              '%; background:' + scale.ramp(r.agg, scale.min, scale.max) + '"></div>' +
          '</div>' +
          '<span class="bar-num">' + r.agg.toFixed(1) + '</span>' +
        '</td>' +
      '</tr>';
    }
    rowsHtml += '</tbody></table>';
    return '<div class="heat-facet">' + title + rowsHtml + '</div>';
  }).join('');

  const summary = document.getElementById('summary');
  summary.textContent = 'showing ' + filtered.length + ' samples in ' +
    panels.length + ' bar chart' + (panels.length === 1 ? '' : 's') +
    ' (' + totalBars + ' bars total)';
  const facetLabel = facetAxis === 'all' ? '' : ' · facet = ' + facetAxis;
  document.getElementById('bar-title').textContent =
    aggLabel + ' ' + scale.label + ' · axis = ' + rowAxis + facetLabel +
    ' · shared scale 0–' + scale.max;
  document.getElementById('bar-body').innerHTML = body;
}

// Show/hide the polar view-switcher + axis controls based on chart
// type, then activate the matching view-panel. Bar chart reuses the
// row-axis picker (as the categorical axis) and hides col-axis; polar
// hides the whole axes fieldset.
function applyChartTypeVisibility() {
  const ct = state.chartType;
  const isPolar = ct === 'polar';
  const isChan  = ct === 'channels';
  document.getElementById('view-switcher').style.display = isPolar ? '' : 'none';
  document.getElementById('polar-legend').style.display = isPolar ? '' : 'none';
  document.getElementById('ctl-heatmap-axes').style.display = isPolar ? 'none' : '';
  // col-axis only applies to heatmap; hide its label row for bar + xy.
  const colLabel = document.getElementById('heat-col-axis').closest('label');
  if (colLabel) colLabel.style.display = ct === 'heatmap' ? '' : 'none';
  // Channels chart doesn't use row/metric — its axes are fixed R/G/B.
  // Hide those pickers to reduce noise; show the channels-source
  // picker (measured vs raw) which is channels-only.
  const rowLabel    = document.getElementById('heat-row-axis').closest('label');
  const metricLabel = document.getElementById('heat-metric').closest('label');
  if (rowLabel)    rowLabel.style.display    = isChan ? 'none' : '';
  if (metricLabel) metricLabel.style.display = isChan ? 'none' : '';
  document.getElementById('heat-chan-src-label').style.display = isChan ? '' : 'none';
  if (ct === 'polar') {
    const checked = document.querySelector('input[name="view"]:checked');
    activateView(checked ? checked.value : 'per-level');
  } else {
    activateView(ct);
  }
  render();
}

function render() {
  const filtered = filterSamples();
  lastFiltered = filtered; // cache for hover tooltips (2D + 3D)
  if (state.chartType === 'heatmap') {
    renderHeatmap(filtered);
  } else if (state.chartType === 'bar') {
    renderBar(filtered);
  } else if (state.chartType === 'xy') {
    renderXY(filtered);
  } else if (state.chartType === 'channels') {
    renderChannels(filtered);
  } else {
    renderPolar(filtered);
  }
}

// Channels chart. Three vertically-stacked XY panels (R, G, B) per
// facet — X = expected linear-sRGB channel value, Y = either measured
// (post-WB) or raw (pre-WB) linear-sRGB, chosen via state.channelSource.
// Same y=x diagonal reference on each; per-panel points aggregated per
// unique X value (mean/median).
//
// Debug story: fit a line per channel and read off slope + intercept.
// slope 1 + intercept 0 = perfect. Non-zero intercept common to all
// three channels = sensor black-point / stray-light offset (see the
// user's chroma-compression case). Slopes differing across channels =
// WB gain miscalibration.
function renderChannels(filtered) {
  const {facetAxis, channelSource} = state;
  const srcLabel = channelSource === 'raw' ? 'raw (pre-WB)' : 'measured (post-WB)';

  // Partition by facet.
  const facetGroups = new Map();
  if (facetAxis === 'all') {
    facetGroups.set('(all)', filtered);
  } else {
    for (const s of filtered) {
      const f = axisValueOf(s, facetAxis);
      if (f == null) continue;
      const key = String(f);
      if (!facetGroups.has(key)) facetGroups.set(key, []);
      facetGroups.get(key).push(s);
    }
  }
  const facetKeys = sortAxisValues([...facetGroups.keys()]);

  const CHANNELS = [
    {idx: 0, name: 'R', stroke: '#c62828'},
    {idx: 1, name: 'G', stroke: '#2e7d32'},
    {idx: 2, name: 'B', stroke: '#1565c0'},
  ];

  // Per-panel per-channel bin: X value → {ys: []}. X = expected
  // linear-sRGB rounded to 3 decimals so tiny float differences from
  // the analyzer don't split logical bins. That gives ~10-30 unique
  // X values per channel per facet — enough dots to see a slope,
  // few enough to render fast.
  const panels = facetKeys.map(k => {
    const samples = facetGroups.get(k);
    const perChannel = CHANNELS.map(() => new Map());
    for (const s of samples) {
      // Reducer applies to the 'raw' side of channels chart too — if
      // the user is comparing raw R/G/B vs expected, they should see
      // the reducer they picked. 'measured' is already computed through
      // rawOfSample upstream in filterSamples, so it doesn't need
      // re-routing here.
      const src = channelSource === 'raw' ? rawOfSample(s) : s.measuredRgb;
      if (!s.expectedRgb || !src) continue;
      for (const c of CHANNELS) {
        const x = Math.round(s.expectedRgb[c.idx] * 1000) / 1000;
        const y = src[c.idx];
        let arr = perChannel[c.idx].get(x);
        if (!arr) { arr = []; perChannel[c.idx].set(x, arr); }
        arr.push(y);
      }
    }
    const channelPoints = perChannel.map(bins => {
      const xs = [...bins.keys()].sort((a, b) => a - b);
      return xs.map(x => ({x, y: aggregateNums(bins.get(x)), n: bins.get(x).length}));
    });

    // Per-facet ref-card aggregation. For each ref card present in
    // this facet's samples, compute the mean raw + mean measured
    // (post-current-WB) across all UNIQUE shutters. Deduped by
    // refOptions object identity — samples of the same shutter share
    // the same refOptions reference, so we only process each shutter
    // once. Expected is a constant per ref card (from REF_CARD_EXPECTED
    // — same across shutters), so we just take the first non-null.
    const refStats = new Map();
    const seenRef = new Set();
    for (const s of samples) {
      if (seenRef.has(s.refOptions)) continue;
      seenRef.add(s.refOptions);
      const wb = computeWB(s.refOptions, state.firstRef, state.secondRef);
      for (const [name, ref] of Object.entries(s.refOptions)) {
        let e = refStats.get(name);
        if (!e) {
          e = {expected: ref.expected, rawSum: [0, 0, 0],
               meaSum: [0, 0, 0], n: 0};
          refStats.set(name, e);
        }
        const refRaw = rawOfRef(ref);
        for (let k = 0; k < 3; k++) e.rawSum[k] += refRaw[k];
        if (wb) {
          const m = applyWB(refRaw, wb);
          for (let k = 0; k < 3; k++) e.meaSum[k] += m[k];
        }
        e.n++;
      }
    }
    const refData = [];
    for (const [name, e] of refStats) {
      refData.push({
        name,
        expected: e.expected,
        raw: e.rawSum.map(x => x / e.n),
        measured: e.meaSum.map(x => x / e.n),
      });
    }
    return {key: k, samples, channelPoints, refData};
  });

  // Axis bounds computed independently for X and Y across all panels
  // + channels. X (expected) is data-bounded (typically 0–~0.9 for
  // the Munsell chip lattice); Y (measured or raw) can overshoot
  // considerably when WB is miscalibrated — decoupled bounds keep
  // X readable when Y blows up. Include ref-card points in the
  // bounds so their overlay stays inside the frame even when a card
  // (e.g. postit's R at 0.95) exceeds any cell's expected.
  let xMax = 0;
  let yMax = 0;
  for (const p of panels) for (const pts of p.channelPoints) for (const pt of pts) {
    if (pt.x > xMax) xMax = pt.x;
    if (pt.y > yMax) yMax = pt.y;
  }
  for (const p of panels) for (const r of p.refData) {
    for (let k = 0; k < 3; k++) {
      if (r.expected[k] > xMax) xMax = r.expected[k];
      const y = channelSource === 'raw' ? r.raw[k] : r.measured[k];
      if (y > yMax) yMax = y;
    }
  }
  xMax = Math.max(0.05, Math.ceil(xMax * 20) / 20);
  yMax = Math.max(0.05, Math.ceil(yMax * 20) / 20);
  const totalPoints = panels.reduce(
    (a, p) => a + p.channelPoints.reduce((b, c) => b + c.length, 0),
    0,
  );
  const aggLabel = state.aggFn === 'median' ? 'median' : 'mean';

  const body = panels.map(p => {
    const title = facetAxis === 'all'
      ? ''
      : '<div class="heat-facet-title">' + escapeHtml(facetAxis) +
        ' = ' + escapeHtml(p.key) + '  <span class="n">(' +
        p.samples.length + ' samples)</span></div>';
    return '<div class="heat-facet">' + title +
      channelsSvg(p.channelPoints, p.refData, xMax, yMax, CHANNELS,
        srcLabel, channelSource, state.firstRef, state.secondRef) + '</div>';
  }).join('');

  document.getElementById('summary').textContent =
    'showing ' + filtered.length + ' samples across ' +
    panels.length + ' panel' + (panels.length === 1 ? '' : 's') +
    ' (' + totalPoints + ' points total)';
  const facetLabel = facetAxis === 'all' ? '' : ' · facet = ' + facetAxis;
  document.getElementById('channels-title').textContent =
    aggLabel + ' per expected value · y = ' + srcLabel + facetLabel +
    ' · x 0–' + xMax.toFixed(2) + ', y 0–' + yMax.toFixed(2);
  document.getElementById('channels-body').innerHTML = body;
}

// Three stacked XY panels (R, G, B) in one SVG. Shared X axis at the
// bottom, per-panel Y axis on the left. X and Y bounds are independent
// so an overshooting measured Y doesn't crush the expected-X resolution.
// The y=x diagonal is still drawn as the true line — it just won't be
// at a 45° pixel angle when xMax != yMax (which is normal here since
// expected caps near 1 and measured can overshoot).
//
// Ref-card overlay: each panel gets one dot per ref card at (expected,
// y) where y matches the panel's source (raw or measured). The two
// currently-selected refs are highlighted; a dotted line through them
// (or through the origin + single ref in one-ref mode) shows the
// linear transform the WB is applying to correct raw → measured.
function channelsSvg(channelPoints, refData, xMax, yMax, channels,
    srcLabel, channelSource, firstRef, secondRef) {
  const W = 540;
  const PAD_L = 46;
  const PAD_R = 12;
  const PAD_TOP = 10;
  const PAD_MID = 18;
  const PAD_BOT = 26;
  const PANEL_H = 150;
  const H = PAD_TOP + 3 * PANEL_H + 2 * PAD_MID + PAD_BOT;
  const chartW = W - PAD_L - PAD_R;

  const niceStep = span => {
    const raw = span / 5;
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / pow;
    const nice = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
    return nice * pow;
  };
  const ticks = (min, max, step) => {
    const out = [];
    const start = Math.ceil(min / step) * step;
    for (let v = start; v <= max + 1e-9; v += step) out.push(Math.round(v * 1e4) / 1e4);
    return out;
  };
  const xStep = niceStep(xMax);
  const yStep = niceStep(yMax);
  // Cap the diagonal at whichever axis runs out first so it stays in
  // frame — y=x reaches the top of the panel at y=yMax (if yMax<xMax)
  // or the right edge at x=xMax (if xMax<yMax).
  const diagEnd = Math.min(xMax, yMax);

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const xPx = x => PAD_L + (clamp(x, 0, xMax) / xMax) * chartW;

  const parts = [];
  for (let i = 0; i < channels.length; i++) {
    const ch = channels[i];
    const points = channelPoints[ch.idx];
    const top = PAD_TOP + i * (PANEL_H + PAD_MID);
    const bot = top + PANEL_H;
    const yPx = y => bot - (clamp(y, 0, yMax) / yMax) * PANEL_H;

    parts.push('<rect x="' + PAD_L + '" y="' + top +
      '" width="' + chartW + '" height="' + PANEL_H +
      '" fill="#fafafa" stroke="#ddd"/>');
    for (const v of ticks(0, xMax, xStep)) {
      parts.push('<line x1="' + xPx(v) + '" y1="' + top +
        '" x2="' + xPx(v) + '" y2="' + bot +
        '" stroke="#ddd" stroke-width="0.5"/>');
    }
    for (const v of ticks(0, yMax, yStep)) {
      parts.push('<line x1="' + PAD_L + '" y1="' + yPx(v) +
        '" x2="' + (PAD_L + chartW) + '" y2="' + yPx(v) +
        '" stroke="#ddd" stroke-width="0.5"/>');
      parts.push('<text x="' + (PAD_L - 4) + '" y="' + (yPx(v) + 3) +
        '" text-anchor="end" font-size="10" fill="#555">' + v + '</text>');
    }
    // Diagonal y=x reference (in data space, not pixel space).
    parts.push('<line x1="' + xPx(0) + '" y1="' + yPx(0) +
      '" x2="' + xPx(diagEnd) + '" y2="' + yPx(diagEnd) +
      '" stroke="#999" stroke-width="1" stroke-dasharray="4,3"/>');
    // Points + line.
    if (points.length > 0) {
      const dPath = points
        .map((p, j) => (j === 0 ? 'M' : 'L') + xPx(p.x) + ',' + yPx(p.y))
        .join(' ');
      parts.push('<path d="' + dPath +
        '" fill="none" stroke="' + ch.stroke + '" stroke-width="2"/>');
      for (const p of points) {
        parts.push('<circle cx="' + xPx(p.x) + '" cy="' + yPx(p.y) +
          '" r="3" fill="' + ch.stroke + '"><title>expected=' +
          p.x.toFixed(3) + ', mean=' + p.y.toFixed(3) + ', n=' + p.n +
          '</title></circle>');
      }
    }

    // Ref-card overlay + fit line. Each ref lands at (expected[k],
    // y[k]) where y matches the panel's channelSource. Non-selected
    // refs = small hollow grey circles. Selected first/second = large
    // filled dark circles with a coloured ring. Fit line = dashed
    // black through the selected pair (or through origin + first ref
    // if second is 'none'), extrapolated to panel bounds so the eye
    // reads the slope + intercept of the WB transform directly.
    const yOfRef = r => channelSource === 'raw' ? r.raw[ch.idx] : r.measured[ch.idx];
    let firstPt = null, secondPt = null;
    for (const r of refData) {
      const cx = xPx(r.expected[ch.idx]);
      const cy = yPx(yOfRef(r));
      const isFirst = r.name === firstRef;
      const isSecond = r.name === secondRef;
      if (isFirst) firstPt = {x: r.expected[ch.idx], y: yOfRef(r)};
      if (isSecond) secondPt = {x: r.expected[ch.idx], y: yOfRef(r)};
      const isSel = isFirst || isSecond;
      const ringColor = isFirst ? '#1565c0' : isSecond ? '#7b1fa2' : '#666';
      const fill = isSel ? '#222' : 'none';
      const rr = isSel ? 6 : 4;
      const sw = isSel ? 2 : 1;
      parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + rr +
        '" fill="' + fill + '" stroke="' + ringColor +
        '" stroke-width="' + sw + '"><title>' + escapeHtml(r.name) +
        ': expected=' + r.expected[ch.idx].toFixed(3) +
        ', ' + channelSource + '=' + yOfRef(r).toFixed(3) +
        '</title></circle>');
      parts.push('<text x="' + (cx + 8) + '" y="' + (cy + 3) +
        '" font-size="10" fill="' + ringColor +
        '" font-weight="' + (isSel ? '600' : '400') + '">' +
        escapeHtml(r.name) + '</text>');
    }
    // Fit line — extrapolate through selected refs to the panel edges.
    // Two refs: line through both. One ref: line through origin + it
    // (slope-only, no offset). None: no line.
    if (firstPt) {
      let x0 = 0, y0 = 0, x1 = xMax, y1 = 0;
      if (secondPt) {
        const dx = firstPt.x - secondPt.x;
        if (Math.abs(dx) > 1e-9) {
          const slope = (firstPt.y - secondPt.y) / dx;
          const yInt = firstPt.y - slope * firstPt.x;
          y0 = yInt;
          y1 = slope * xMax + yInt;
        }
      } else {
        // Single ref: through origin and firstPt.
        const slope = firstPt.x > 0 ? firstPt.y / firstPt.x : 0;
        y0 = 0;
        y1 = slope * xMax;
      }
      parts.push('<line x1="' + xPx(x0) + '" y1="' + yPx(y0) +
        '" x2="' + xPx(x1) + '" y2="' + yPx(y1) +
        '" stroke="#111" stroke-width="1" stroke-dasharray="3,3" opacity="0.7"/>');
    }

    // Channel label (top-left of panel).
    parts.push('<text x="' + (PAD_L + 6) + '" y="' + (top + 14) +
      '" font-size="12" font-weight="bold" fill="' + ch.stroke + '">' +
      ch.name + '</text>');
  }

  // Shared X-axis labels (below bottom panel).
  const bottomBot = PAD_TOP + 3 * PANEL_H + 2 * PAD_MID;
  for (const v of ticks(0, xMax, xStep)) {
    parts.push('<text x="' + xPx(v) + '" y="' + (bottomBot + 12) +
      '" text-anchor="middle" font-size="10" fill="#555">' + v + '</text>');
  }
  parts.push('<text x="' + (PAD_L + chartW / 2) + '" y="' + (bottomBot + 22) +
    '" text-anchor="middle" font-size="11" fill="#333">expected linear-sRGB</text>');
  parts.push('<text transform="translate(' + (PAD_L - 32) +
    ',' + (PAD_TOP + (3 * PANEL_H + 2 * PAD_MID) / 2) +
    ') rotate(-90)" text-anchor="middle" font-size="11" fill="#333">' +
    escapeHtml(srcLabel) + '</text>');

  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W +
    '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' +
    parts.join('') + '</svg>';
}

// XY chart. Two vertically-stacked panels sharing the same X axis
// (expected value or expected chroma). Top panel: measured value/
// chroma with a y=x diagonal reference (perfect linearity). Bottom
// panel: mean measured/expected ratio with a y=1 reference (perfect
// scaling). Points are per-X-bin aggregates (mean or median), lines
// connect consecutive bins.
//
// Only meaningful when rowAxis is an expected dimension and metric is
// the matching measured dimension. Anything else prints a hint and
// bails — everything else in the picker (device, format, ΔE, etc.)
// doesn't map to a linearity story on the same-unit axes.
function renderXY(filtered) {
  const {rowAxis, facetAxis, metric} = state;
  // Recognised triples: (rowAxis, metric, dimension). Dimension
  // controls axis units and whether the second panel is a ratio
  // (unsigned) or a delta (signed, appropriate for hue).
  let dim = null;
  if (rowAxis === 'expValue'  && metric === 'meaValue')    dim = 'value';
  if (rowAxis === 'expChroma' && metric === 'meaChroma')   dim = 'chroma';
  if (rowAxis === 'expHue'    && metric === 'meaHueAngle') dim = 'hue';
  if (!dim) {
    document.getElementById('xy-title').textContent =
      'XY needs matched expected + measured axes';
    document.getElementById('xy-body').innerHTML =
      '<div class="xy-hint">Pick a matched pair — <b>rows = value (expected)</b> ' +
      'with <b>metric = measured value</b>, <b>rows = chroma (expected)</b> ' +
      'with <b>metric = measured chroma</b>, or <b>rows = hue angle (expected)</b> ' +
      'with <b>metric = measured hue angle</b>. Diagonal on top = perfect ' +
      'linearity. Bottom panel = ratio (value/chroma; ideal 1) or angular ' +
      'delta (hue; ideal 0°).</div>';
    document.getElementById('summary').textContent =
      'XY chart — select matched axes above';
    return;
  }

  const xLabel = dim === 'hue' ? 'expected hue (°)'
              : dim === 'chroma' ? 'expected chroma'
              : 'expected value';
  const yLabel = dim === 'hue' ? 'measured hue (°)'
              : dim === 'chroma' ? 'measured chroma'
              : 'measured value';
  // Second panel: ratio (unsigned, ideal 1) for value/chroma; delta
  // (signed, ideal 0) for hue.
  const isDelta = dim === 'hue';
  const secRef = isDelta ? 0 : 1;
  const secLabel = isDelta ? 'delta (°)' : 'ratio';

  // Partition by facet.
  const facetGroups = new Map();
  if (facetAxis === 'all') {
    facetGroups.set('(all)', filtered);
  } else {
    for (const s of filtered) {
      const f = axisValueOf(s, facetAxis);
      if (f == null) continue;
      const key = String(f);
      if (!facetGroups.has(key)) facetGroups.set(key, []);
      facetGroups.get(key).push(s);
    }
  }
  const facetKeys = sortAxisValues([...facetGroups.keys()]);

  const xyOf = (exp, mea) => {
    if (dim === 'value')  return {x: exp.value,  y: mea.value,  hueStr: null};
    if (dim === 'chroma') return {x: exp.chroma, y: mea.chroma, hueStr: null};
    return {
      x: hueAngle(exp.family, exp.step),
      y: hueAngle(mea.family, mea.step),
      hueStr: String(exp.step) + exp.family,
    };
  };

  const panels = facetKeys.map(k => {
    const samples = facetGroups.get(k);
    const byX = new Map();
    for (const s of samples) {
      const exp = parseNotation(s.expected);
      const mea = parseNotation(s.measured);
      if (!exp || !mea) continue;
      const {x, y, hueStr} = xyOf(exp, mea);
      if (!isDelta && x === 0) continue; // ratio undefined at 0
      const sec = isDelta ? (y - x) : (y / x);
      let bin = byX.get(x);
      if (!bin) { bin = {ys: [], secs: [], hueStr}; byX.set(x, bin); }
      bin.ys.push(y);
      bin.secs.push(sec);
    }
    const xs = [...byX.keys()].sort((a, b) => a - b);
    const points = xs.map(x => {
      const bin = byX.get(x);
      return {
        x,
        y: aggregateNums(bin.ys),
        sec: aggregateNums(bin.secs),
        n: bin.ys.length,
        hueStr: bin.hueStr,
      };
    });
    // Colour swatch per point — hue mode only. Uses the representative
    // (~chroma 6, value 5) chip's linear-sRGB, gamma-encoded via
    // rgbHex. null for points without a matching chip (rare — mostly
    // GLEY hues far outside the wedge that aren't in the lattice).
    const swatches = dim === 'hue'
      ? points.map(p => {
          const c = p.hueStr ? representativeChipFor(p.hueStr) : null;
          return c ? {hex: rgbHex(c.rgb), title: c.notation} : null;
        })
      : null;
    return {key: k, samples, points, swatches};
  });

  const totalPoints = panels.reduce((a, p) => a + p.points.length, 0);
  const aggLabel = state.aggFn === 'median' ? 'median' : 'mean';

  // Axis bounds. Value / chroma are Munsell-bounded so [0, 10] is
  // fixed. Hue can range past the wedge (family G/BG/B/PB/P/RP push
  // hueAngle() up to ~240°) — fit main-panel min/max and delta min/
  // max to actual data across ALL facets so panels remain comparable,
  // then pad out to a "nice" 30° / 10° step so the axis reads cleanly.
  const roundUp = (v, step) => Math.ceil(v / step) * step;
  const roundDn = (v, step) => Math.floor(v / step) * step;
  let axisMin, axisMax, secMin, secMax;
  if (dim === 'hue') {
    let mn = Infinity, mx = -Infinity;
    let smn = Infinity, smx = -Infinity;
    for (const p of panels) for (const pt of p.points) {
      if (pt.x < mn) mn = pt.x;
      if (pt.x > mx) mx = pt.x;
      if (pt.y < mn) mn = pt.y;
      if (pt.y > mx) mx = pt.y;
      if (pt.sec < smn) smn = pt.sec;
      if (pt.sec > smx) smx = pt.sec;
    }
    if (!isFinite(mn)) { mn = -90; mx = 90; smn = -30; smx = 30; }
    axisMin = Math.min(0, roundDn(mn, 30));
    axisMax = Math.max(0, roundUp(mx, 30));
    // Delta panel: pad by ~5° so points don't touch the frame; keep
    // symmetric so the y=0 reference sits centred when data straddles.
    const sbound = Math.max(Math.abs(smn), Math.abs(smx), 5);
    secMax = roundUp(sbound, 10);
    secMin = -secMax;
  } else {
    axisMin = 0;
    axisMax = 10;
    secMin = 0;
    secMax = 2;
  }

  const body = panels.map(p => {
    const title = facetAxis === 'all'
      ? ''
      : '<div class="heat-facet-title">' + escapeHtml(facetAxis) +
        ' = ' + escapeHtml(p.key) + '  <span class="n">(' +
        p.samples.length + ' samples · ' + p.points.length +
        ' bins)</span></div>';
    return '<div class="heat-facet">' + title +
      xySvg(p.points, {axisMin, axisMax, secMin, secMax, secRef, secLabel},
        xLabel, yLabel, p.swatches) + '</div>';
  }).join('');

  document.getElementById('summary').textContent =
    'showing ' + filtered.length + ' samples across ' +
    panels.length + ' panel' + (panels.length === 1 ? '' : 's') +
    ' (' + totalPoints + ' X bins total)';
  const facetLabel = facetAxis === 'all' ? '' : ' · facet = ' + facetAxis;
  document.getElementById('xy-title').textContent =
    aggLabel + ' per bin · x = ' + xLabel + ' · y-top = ' + yLabel +
    ' · y-bot = ' + secLabel + facetLabel + ' · axes ' + axisMin +
    '–' + axisMax + ', ' + secLabel + ' ' + secMin + '–' + secMax;
  document.getElementById('xy-body').innerHTML = body;
}

// Build a stacked-panel SVG. Top: (x, y) with y=x diagonal reference.
// Bottom: (x, sec) with a horizontal reference at cfg.secRef — sec is
// either the ratio (value/chroma) or the delta in ° (hue). Shared X
// axis. Numeric ticks on both axes, spacing chosen to give ~6 major
// ticks across each range.
function xySvg(points, cfg, xLabel, yLabel, swatches) {
  const {axisMin, axisMax, secMin, secMax, secRef, secLabel} = cfg;
  const W = 540;
  const PAD_L = 46;
  const PAD_R = 12;
  const PAD_TOP = 10;
  const PAD_MID = 30;
  const PAD_BOT = 26;
  const MAIN_H = 220;
  const SEC_H = 100;
  // Colour swatch strip sits between the delta panel and the X axis
  // labels — only present when the caller passed a swatches array
  // (currently just hue mode). Width per swatch is derived from the
  // narrowest x-gap so adjacent swatches don't overlap.
  const SWATCH_H = swatches ? 22 : 0;
  const SWATCH_GAP = swatches ? 6 : 0;
  const H = PAD_TOP + MAIN_H + PAD_MID + SEC_H + SWATCH_GAP + SWATCH_H + PAD_BOT;
  const chartW = W - PAD_L - PAD_R;
  const mainTop = PAD_TOP;
  const mainBot = PAD_TOP + MAIN_H;
  const secTop = mainBot + PAD_MID;
  const secBot = secTop + SEC_H;
  const swatchTop = secBot + SWATCH_GAP;
  const swatchBot = swatchTop + SWATCH_H;
  const xAxisLabelsY = (swatches ? swatchBot : secBot) + 12;
  const xAxisTitleY  = (swatches ? swatchBot : secBot) + 22;

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const xPx = x => PAD_L + ((clamp(x, axisMin, axisMax) - axisMin) /
    (axisMax - axisMin)) * chartW;
  const yPx = y => mainBot - ((clamp(y, axisMin, axisMax) - axisMin) /
    (axisMax - axisMin)) * MAIN_H;
  const sPx = s => secBot - ((clamp(s, secMin, secMax) - secMin) /
    (secMax - secMin)) * SEC_H;

  // Choose a "nice" tick step: aim for ~6 major ticks across the range.
  const niceStep = span => {
    const raw = span / 6;
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / pow;
    const nice = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10;
    return nice * pow;
  };
  const majorX = niceStep(axisMax - axisMin);
  const majorY = majorX;
  const majorS = niceStep(secMax - secMin);
  const ticks = (min, max, step) => {
    const out = [];
    const start = Math.ceil(min / step) * step;
    for (let v = start; v <= max + 1e-9; v += step) out.push(Math.round(v * 1e4) / 1e4);
    return out;
  };

  const parts = [];

  // --- Main panel (measured vs expected) --------------------------------
  parts.push('<rect x="' + PAD_L + '" y="' + mainTop +
    '" width="' + chartW + '" height="' + MAIN_H +
    '" fill="#fafafa" stroke="#ddd"/>');
  for (const v of ticks(axisMin, axisMax, majorX)) {
    const px = xPx(v);
    parts.push('<line x1="' + px + '" y1="' + mainTop +
      '" x2="' + px + '" y2="' + mainBot +
      '" stroke="#ddd" stroke-width="0.5"/>');
  }
  for (const v of ticks(axisMin, axisMax, majorY)) {
    const py = yPx(v);
    parts.push('<line x1="' + PAD_L + '" y1="' + py +
      '" x2="' + (PAD_L + chartW) + '" y2="' + py +
      '" stroke="#ddd" stroke-width="0.5"/>');
    parts.push('<text x="' + (PAD_L - 4) + '" y="' + (py + 3) +
      '" text-anchor="end" font-size="10" fill="#555">' + v + '</text>');
  }
  // Diagonal y=x reference.
  parts.push('<line x1="' + xPx(axisMin) + '" y1="' + yPx(axisMin) +
    '" x2="' + xPx(axisMax) + '" y2="' + yPx(axisMax) +
    '" stroke="#999" stroke-width="1" stroke-dasharray="4,3"/>');
  if (points.length > 0) {
    const dPath = points
      .map((p, i) => (i === 0 ? 'M' : 'L') + xPx(p.x) + ',' + yPx(p.y))
      .join(' ');
    parts.push('<path d="' + dPath +
      '" fill="none" stroke="#005766" stroke-width="2"/>');
    for (const p of points) {
      parts.push('<circle cx="' + xPx(p.x) + '" cy="' + yPx(p.y) +
        '" r="3.5" fill="#005766"><title>x=' + p.x +
        ', mean y=' + p.y.toFixed(2) + ', n=' + p.n + '</title></circle>');
    }
  }
  parts.push('<text transform="translate(' + (PAD_L - 32) +
    ',' + (mainTop + MAIN_H / 2) + ') rotate(-90)" text-anchor="middle" ' +
    'font-size="11" fill="#333">' + escapeHtml(yLabel) + '</text>');

  // --- Secondary panel (ratio or delta vs expected) ---------------------
  parts.push('<rect x="' + PAD_L + '" y="' + secTop +
    '" width="' + chartW + '" height="' + SEC_H +
    '" fill="#fafafa" stroke="#ddd"/>');
  for (const v of ticks(axisMin, axisMax, majorX)) {
    const px = xPx(v);
    parts.push('<line x1="' + px + '" y1="' + secTop +
      '" x2="' + px + '" y2="' + secBot +
      '" stroke="#ddd" stroke-width="0.5"/>');
    parts.push('<text x="' + px + '" y="' + xAxisLabelsY +
      '" text-anchor="middle" font-size="10" fill="#555">' + v + '</text>');
  }
  for (const s of ticks(secMin, secMax, majorS)) {
    const py = sPx(s);
    const isRef = Math.abs(s - secRef) < 1e-9;
    parts.push('<line x1="' + PAD_L + '" y1="' + py +
      '" x2="' + (PAD_L + chartW) + '" y2="' + py +
      '" stroke="' + (isRef ? '#999' : '#eee') +
      '" stroke-width="' + (isRef ? 1 : 0.5) +
      '" stroke-dasharray="' + (isRef ? '4,3' : '') + '"/>');
    parts.push('<text x="' + (PAD_L - 4) + '" y="' + (py + 3) +
      '" text-anchor="end" font-size="10" fill="#555">' + s + '</text>');
  }
  if (points.length > 0) {
    const dPath = points
      .map((p, i) => (i === 0 ? 'M' : 'L') + xPx(p.x) + ',' + sPx(p.sec))
      .join(' ');
    parts.push('<path d="' + dPath +
      '" fill="none" stroke="#c62828" stroke-width="2"/>');
    for (const p of points) {
      parts.push('<circle cx="' + xPx(p.x) + '" cy="' + sPx(p.sec) +
        '" r="3.5" fill="#c62828"><title>x=' + p.x +
        ', ' + secLabel + '=' + p.sec.toFixed(3) + ', n=' + p.n +
        '</title></circle>');
    }
  }
  parts.push('<text transform="translate(' + (PAD_L - 32) +
    ',' + (secTop + SEC_H / 2) + ') rotate(-90)" text-anchor="middle" ' +
    'font-size="11" fill="#333">' + escapeHtml(secLabel) + '</text>');

  // --- Colour swatch strip (hue mode only) ------------------------------
  // One rect per point, centred on xPx(p.x). Swatch width is capped
  // so adjacent bins don't overlap when data is dense; a dim outline
  // keeps swatches distinguishable against white/near-white fills.
  if (swatches) {
    let minGap = axisMax - axisMin;
    for (let i = 1; i < points.length; i++) {
      const gap = xPx(points[i].x) - xPx(points[i - 1].x);
      if (gap < minGap) minGap = gap;
    }
    const swatchW = Math.max(6, Math.min(20, minGap - 2));
    for (let i = 0; i < points.length; i++) {
      const sw = swatches[i];
      if (!sw) continue;
      const cx = xPx(points[i].x);
      parts.push('<rect x="' + (cx - swatchW / 2) + '" y="' + swatchTop +
        '" width="' + swatchW + '" height="' + SWATCH_H +
        '" fill="' + sw.hex + '" stroke="rgba(0,0,0,0.35)" stroke-width="0.5">' +
        '<title>' + escapeHtml(sw.title) + '</title></rect>');
    }
  }

  parts.push('<text x="' + (PAD_L + chartW / 2) + '" y="' + xAxisTitleY +
    '" text-anchor="middle" font-size="11" fill="#333">' +
    escapeHtml(xLabel) + '</text>');

  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + W +
    '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' +
    parts.join('') + '</svg>';
}

// ---- 3D stacked view (Three.js) ----------------------------------------

// Same radial + angular scale as the 2D disks; Y is value * VSCALE.
// Value scaling loosely matches chroma scale so the stack has roughly
// isometric proportions.
const R_PER_CHROMA_3D = 30;
const VSCALE = 60;

let scene3D, camera3D, renderer3D, controls3D;
let chipMesh3D = null;
let arrowLines3D = null;
// Sprite labels (value + hue anchors) collected so the animate loop
// can update their opacity based on camera distance — labels fade
// as the user zooms out so they don't crowd the scene.
const labelSprites = [];
// Snapshot of the last filterSamples() call. Both the 2D and 3D
// hover tooltips read this to compute per-chip sample stats without
// re-filtering on every mousemove. Refreshed by render().
let lastFiltered = [];

// Shared floating tooltip used by both the 2D disk hover and the 3D
// raycast hover. Positioned fixed to the viewport so it can float
// over any container.
let hoverTooltipEl = null;
function ensureHoverTooltip() {
  if (hoverTooltipEl) return hoverTooltipEl;
  hoverTooltipEl = document.createElement('div');
  hoverTooltipEl.id = 'chip-hover-tooltip';
  hoverTooltipEl.style.cssText =
    'position:fixed; pointer-events:none; ' +
    'background:rgba(255,255,255,0.96); border:1px solid #999; ' +
    'border-radius:4px; padding:6px 10px; font-size:12px; ' +
    'box-shadow:0 2px 8px rgba(0,0,0,0.15); display:none; ' +
    'z-index:10000; font-family:-apple-system,BlinkMacSystemFont,sans-serif; ' +
    'line-height:1.4;';
  document.body.appendChild(hoverTooltipEl);
  return hoverTooltipEl;
}

function tooltipHtmlForChip(notation, hex) {
  let n = 0, sumDE = 0;
  for (const s of lastFiltered) {
    if (s.expected === notation) {
      n++;
      sumDE += s.deltaE || 0;
    }
  }
  return '<div style="font-weight:600;font-size:13px;margin-bottom:2px;">' +
      notation + '</div>' +
    '<div style="display:flex;align-items:center;gap:6px;">' +
      '<span style="width:16px;height:16px;background:' + hex +
        ';border:1px solid #666;display:inline-block;"></span>' +
      '<span style="color:#555;">expected chip</span>' +
    '</div>' +
    (n > 0
      ? '<div style="margin-top:3px;">' + n + ' sample' +
        (n === 1 ? '' : 's') + ' · mean ΔE ' +
        (sumDE / n).toFixed(1) + '</div>'
      : '<div style="margin-top:3px;color:#999;">no samples match current filters</div>');
}

function positionTooltipAtCursor(el, clientX, clientY) {
  const tw = el.offsetWidth;
  const th = el.offsetHeight;
  let tx = clientX + 14;
  let ty = clientY + 14;
  if (tx + tw > window.innerWidth - 8) tx = clientX - tw - 14;
  if (ty + th > window.innerHeight - 8) ty = clientY - th - 14;
  el.style.left = tx + 'px';
  el.style.top = ty + 'px';
}

// 2D disk hover: event delegation on the #filmstrip container. Each
// chip <circle> in the SVG carries data-notation; the mousemove
// handler reads it, computes stats from lastFiltered, and shows the
// shared tooltip. Chip hex is looked up from CHIPS by notation.
function setup2DChipHover() {
  const filmstrip = document.getElementById('filmstrip');
  if (!filmstrip) return;
  const tooltip = ensureHoverTooltip();
  const chipHexByNotation = new Map();
  for (const c of CHIPS) chipHexByNotation.set(c.notation, rgbHex(c.rgb));

  filmstrip.addEventListener('mousemove', e => {
    const el = e.target;
    if (el && el.tagName === 'circle' &&
        el.getAttribute && el.getAttribute('data-notation')) {
      const notation = el.getAttribute('data-notation');
      const hex = chipHexByNotation.get(notation) || '#ccc';
      tooltip.innerHTML = tooltipHtmlForChip(notation, hex);
      tooltip.style.display = 'block';
      positionTooltipAtCursor(tooltip, e.clientX, e.clientY);
    } else {
      tooltip.style.display = 'none';
    }
  });
  filmstrip.addEventListener('mouseleave', () => {
    tooltip.style.display = 'none';
  });
}

// Canvas-backed text sprite. Sprites always face the camera, so the
// same label reads from any orbit angle without special view-direction
// handling. Text is rendered to an offscreen canvas, uploaded as a
// texture, and scaled so the world-height stays constant regardless
// of the underlying canvas pixel dimensions.
function makeTextSprite(text, opts) {
  const o = opts || {};
  const fontSize = o.fontSize || 40;
  const color = o.color || '#666';       // lighter than pure black, less shouty
  const border = o.border || '#444';      // dark enough to hold contrast against the busy 3D scene
  const bg = o.bg || 'rgba(255,255,255,0.88)';
  const worldSize = o.worldSize || 26;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const fontSpec = fontSize + 'px -apple-system,sans-serif'; // no bold
  ctx.font = fontSpec;
  const metrics = ctx.measureText(text);
  const pad = 8;
  const w = Math.ceil(metrics.width) + pad * 2;
  const h = fontSize + pad * 2;
  canvas.width = w;
  canvas.height = h;
  // Setting canvas.{width,height} clears the context, so re-set font.
  ctx.font = fontSpec;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText(text, w / 2, h / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({map: texture, transparent: true, depthTest: false});
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set((w / h) * worldSize, worldSize, 1);
  // depthTest:false + high renderOrder = labels stay readable even
  // when a chip sphere is technically in front of them.
  sprite.renderOrder = 999;
  return sprite;
}

// Munsell chip → 3D world position. Angle uses the same hueAngle()
// as the 2D view; Y = value * VSCALE (value = height axis, up).
function chipTo3D(hueStr, value, chroma) {
  let angleDeg = 0, r = 0;
  if (hueStr === 'N') {
    angleDeg = 0;
    r = 0;
  } else {
    const fam = hueStr.replace(/^\\d+(?:\\.\\d+)?/, '');
    const stp = parseFloat(hueStr) || 10;
    angleDeg = hueAngle(fam, stp);
    r = chroma * R_PER_CHROMA_3D;
  }
  const a = angleDeg * Math.PI / 180;
  return {x: r * Math.sin(a), y: value * VSCALE, z: -r * Math.cos(a)};
}

// Parsed-notation → 3D. parseNotation returns family/step/value/chroma
// directly, so we synthesise the hue string the same way chipTo3D
// wants it.
function parsedTo3D(p) {
  const hueStr = p.family === 'N' ? 'N' : (p.step + p.family);
  return chipTo3D(hueStr, p.value, p.chroma);
}

// Linear sRGB → THREE.Color (gamma-encoded 0..1 sRGB).
function linearRgbToTHREE(rgb) {
  const gam = v => {
    const c = Math.max(0, Math.min(1, v));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1/2.4) - 0.055;
  };
  return new THREE.Color(gam(rgb[0]), gam(rgb[1]), gam(rgb[2]));
}

// Match deltaValueColor's diverging palette but return a THREE.Color.
function deltaValueColorTHREE(dv) {
  const s = deltaValueColor(dv);
  const m = /rgb\\((\\d+),(\\d+),(\\d+)\\)/.exec(s);
  if (!m) return new THREE.Color(0.5, 0.5, 0.5);
  return new THREE.Color(+m[1]/255, +m[2]/255, +m[3]/255);
}

function setup3D() {
  const container = document.getElementById('viz3d');
  if (!container) return;
  const w = container.clientWidth;
  const h = container.clientHeight;

  scene3D = new THREE.Scene();
  scene3D.background = new THREE.Color(0xf0f0f0);

  camera3D = new THREE.PerspectiveCamera(45, w / h, 1, 5000);
  camera3D.position.set(600, 700, 600);

  renderer3D = new THREE.WebGLRenderer({antialias: true});
  renderer3D.setPixelRatio(window.devicePixelRatio);
  renderer3D.setSize(w, h);
  container.appendChild(renderer3D.domElement);

  controls3D = new THREE.OrbitControls(camera3D, renderer3D.domElement);
  controls3D.target.set(0, 5.5 * VSCALE, 0); // ~middle of value stack
  controls3D.enableDamping = true;
  controls3D.dampingFactor = 0.08;
  controls3D.update();

  // Cheap lighting so the chip spheres get subtle shading and read
  // as spheres, not flat dots. Ambient keeps every side visible;
  // one directional adds the sphere-shading gradient. Slightly
  // brightened so low-value (V1-V3) chips don't turn to mud.
  scene3D.add(new THREE.AmbientLight(0xffffff, 0.75));
  const dl = new THREE.DirectionalLight(0xffffff, 0.7);
  dl.position.set(1, 2, 1);
  scene3D.add(dl);

  // Central value axis so the reader can see "up = value" even
  // before we add value tick labels.
  const axisPositions = [0, 0, 0, 0, 10 * VSCALE, 0];
  const axisGeom = new THREE.BufferGeometry();
  axisGeom.setAttribute('position',
    new THREE.Float32BufferAttribute(axisPositions, 3));
  scene3D.add(new THREE.Line(axisGeom,
    new THREE.LineBasicMaterial({color: 0x999999})));

  // Faint chroma-8 rings at each value level to hint at the disk
  // planes. Shared geometry, translated per value.
  const N = 96;
  const ringPositions = [];
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    ringPositions.push(
      Math.cos(a) * 8 * R_PER_CHROMA_3D, 0,
      Math.sin(a) * 8 * R_PER_CHROMA_3D);
  }
  const ringGeom = new THREE.BufferGeometry();
  ringGeom.setAttribute('position',
    new THREE.Float32BufferAttribute(ringPositions, 3));
  const ringMat = new THREE.LineBasicMaterial(
    {color: 0x555555, transparent: true, opacity: 0.75});
  for (let v = 2; v <= 9; v++) {
    const ring = new THREE.Line(ringGeom, ringMat);
    ring.position.y = v * VSCALE;
    scene3D.add(ring);
  }

  buildChipLattice3D();

  // Value axis labels — one sprite per integer value, offset slightly
  // in X from the central pole so the label doesn't overlap the axis
  // line. Sprites face the camera, so they read from any orbit angle.
  for (let v = 1; v <= 9; v++) {
    const sprite = makeTextSprite('V' + v, {fontSize: 34, worldSize: 22});
    sprite.position.set(20, v * VSCALE, 0);
    sprite.userData.isValueLabel = true;
    scene3D.add(sprite);
    labelSprites.push(sprite);
  }

  // Hue labels around the chroma-8 ring at V=5 (roughly the middle
  // of the value stack). One "10<family>" anchor per hue family that
  // has chips somewhere in the lattice — soil families (R..GY) plus
  // GLEY families (G, BG, B). PB/P/RP have no chips so no anchor.
  const HUE_ANCHORS_3D = [
    {name: '10R',  family: 'R',  step: 10},
    {name: '10YR', family: 'YR', step: 10},
    {name: '10Y',  family: 'Y',  step: 10},
    {name: '10GY', family: 'GY', step: 10},
    {name: '10G',  family: 'G',  step: 10},
    {name: '10BG', family: 'BG', step: 10},
    {name: '10B',  family: 'B',  step: 10},
  ];
  const HUE_R = 8 * R_PER_CHROMA_3D + 25; // just outside chroma-8 ring
  for (const anchor of HUE_ANCHORS_3D) {
    const a = hueAngle(anchor.family, anchor.step) * Math.PI / 180;
    const sprite = makeTextSprite(anchor.name,
      {fontSize: 32, worldSize: 22});
    sprite.position.set(HUE_R * Math.sin(a), 5 * VSCALE,
      -HUE_R * Math.cos(a));
    scene3D.add(sprite);
    labelSprites.push(sprite);
  }

  // Hover tooltip: raycast against the chip InstancedMesh; reuse the
  // shared tooltip element + rendering helpers so 2D and 3D hovers
  // look identical.
  const tooltipEl = ensureHoverTooltip();
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  renderer3D.domElement.addEventListener('mousemove', e => {
    const rect = renderer3D.domElement.getBoundingClientRect();
    ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera3D);
    const hits = raycaster.intersectObject(chipMesh3D);
    if (hits.length === 0 || hits[0].instanceId == null) {
      tooltipEl.style.display = 'none';
      return;
    }
    const chip = CHIPS[hits[0].instanceId];
    tooltipEl.innerHTML = tooltipHtmlForChip(chip.notation, rgbHex(chip.rgb));
    tooltipEl.style.display = 'block';
    positionTooltipAtCursor(tooltipEl, e.clientX, e.clientY);
  });
  renderer3D.domElement.addEventListener('mouseleave', () => {
    tooltipEl.style.display = 'none';
  });

  window.addEventListener('resize', resize3D);

  function animate() {
    requestAnimationFrame(animate);
    // Skip GPU work when the 3D panel is hidden (per-level view
    // selected). The rAF loop itself keeps running so we resume
    // seamlessly on re-activation.
    const panel = document.getElementById('view-3d');
    if (!panel || panel.style.display === 'none') return;
    controls3D.update();
    // Hide value labels when the view is close to vertical (looking
    // straight down or up) — the whole value stack collapses into a
    // dot in that projection, so the labels just clutter the origin.
    // 0.85 ≈ within ~32° of vertical.
    const lookY = (controls3D.target.y - camera3D.position.y);
    const lookLen = camera3D.position.distanceTo(controls3D.target);
    const verticality = lookLen > 0 ? Math.abs(lookY / lookLen) : 0;
    const hideValueLabels = verticality > 0.85;
    // Depth-dim labels: opacity 1.0 up to LABEL_NEAR world units from
    // camera, fading linearly to LABEL_MIN_OPACITY by LABEL_FAR. Keeps
    // the scene calm when zoomed way out.
    const LABEL_NEAR = 700;
    const LABEL_FAR = 1800;
    const LABEL_MIN_OPACITY = 0.22;
    for (const sp of labelSprites) {
      if (sp.userData.isValueLabel && hideValueLabels) {
        sp.visible = false;
        continue;
      }
      sp.visible = true;
      const dist = sp.position.distanceTo(camera3D.position);
      let op = 1;
      if (dist > LABEL_NEAR) {
        const t = Math.min(1, (dist - LABEL_NEAR) / (LABEL_FAR - LABEL_NEAR));
        op = 1 - t * (1 - LABEL_MIN_OPACITY);
      }
      sp.material.opacity = op;
    }
    renderer3D.render(scene3D, camera3D);
  }
  animate();
}

function buildChipLattice3D() {
  // Silhouette outline: a slightly larger sphere per chip rendered
  // as BackSide only. Back faces sit BEHIND the chip's front faces
  // in depth, so where the chip covers them they're hidden — but
  // where the outline sphere extends beyond the chip's silhouette,
  // the dark back face shows through as a thin ring around every
  // chip. Cheap and pure geometry (no shader), one draw call.
  // Chip is 4.5; a very small radius bump makes the outline a thin
  // 1-2px ring visually rather than a fat halo.
  const outlineGeom = new THREE.SphereGeometry(4.75, 12, 8);
  const outlineMat = new THREE.MeshBasicMaterial({
    color: 0x222222,
    side: THREE.BackSide,
  });
  const outlineMesh = new THREE.InstancedMesh(
    outlineGeom, outlineMat, CHIPS.length);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < CHIPS.length; i++) {
    const chip = CHIPS[i];
    const p = chipTo3D(chip.hue, chip.value, chip.chroma);
    dummy.position.set(p.x, p.y, p.z);
    dummy.updateMatrix();
    outlineMesh.setMatrixAt(i, dummy.matrix);
  }
  outlineMesh.instanceMatrix.needsUpdate = true;
  scene3D.add(outlineMesh);

  // Chip fills — Lambert-shaded, per-instance colours from the
  // linear-sRGB expected values (gamma-encoded for display).
  const geom = new THREE.SphereGeometry(4.5, 12, 8);
  const mat = new THREE.MeshLambertMaterial();
  chipMesh3D = new THREE.InstancedMesh(geom, mat, CHIPS.length);
  for (let i = 0; i < CHIPS.length; i++) {
    const chip = CHIPS[i];
    const p = chipTo3D(chip.hue, chip.value, chip.chroma);
    dummy.position.set(p.x, p.y, p.z);
    dummy.updateMatrix();
    chipMesh3D.setMatrixAt(i, dummy.matrix);
    chipMesh3D.setColorAt(i, linearRgbToTHREE(chip.rgb));
  }
  chipMesh3D.instanceMatrix.needsUpdate = true;
  if (chipMesh3D.instanceColor) chipMesh3D.instanceColor.needsUpdate = true;
  scene3D.add(chipMesh3D);
}

function buildArrows3D() {
  if (!scene3D) return;
  if (arrowLines3D) {
    scene3D.remove(arrowLines3D);
    arrowLines3D.geometry.dispose();
    arrowLines3D.material.dispose();
    arrowLines3D = null;
  }
  const filtered = filterSamples();
  const positions = [];
  const colors = [];
  for (const s of filtered) {
    const exp = parseNotation(s.expected);
    const mea = parseNotation(s.measured);
    if (!exp || !mea) continue;
    const p0 = parsedTo3D(exp);
    const p1 = parsedTo3D(mea);
    positions.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z);
    const col = deltaValueColorTHREE(mea.value - exp.value);
    colors.push(col.r, col.g, col.b, col.r, col.g, col.b);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position',
    new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('color',
    new THREE.Float32BufferAttribute(colors, 3));
  const mat = new THREE.LineBasicMaterial(
    {vertexColors: true, transparent: true, opacity: 0.7});
  arrowLines3D = new THREE.LineSegments(geom, mat);
  scene3D.add(arrowLines3D);
}

function resize3D() {
  const container = document.getElementById('viz3d');
  if (!container || !renderer3D) return;
  const wNew = container.clientWidth;
  const hNew = container.clientHeight;
  if (wNew === 0 || hNew === 0) return;
  camera3D.aspect = wNew / hNew;
  camera3D.updateProjectionMatrix();
  renderer3D.setSize(wNew, hNew);
}

// ---- Lab 3D scatter view -------------------------------------------------
// Chips positioned at (a*, L*, b*) so Euclidean 3D pixel distance =
// ΔE₇₆ (which tracks ΔE₀₀ within ~10% for most soil chips). No polar
// wrapping — the Munsell hue circle unfolds naturally around the
// central neutral axis as chips fan out by their a*/b* projections.
// Scene state lives in its own trio of globals so it doesn't fight
// the existing Munsell 3D view.
let sceneLab3D, cameraLab3D, rendererLab3D, controlsLab3D;
let chipMeshLab3D = null;
let arrowLinesLab3D = null;

function setupLab3D() {
  const container = document.getElementById('vizLab3d');
  if (!container) return;
  const w = container.clientWidth;
  const h = container.clientHeight;

  sceneLab3D = new THREE.Scene();
  sceneLab3D.background = new THREE.Color(0xf0f0f0);

  // Lab bounds: L* ∈ [0, 100], a* ∈ ~[-60, +60], b* ∈ ~[-60, +80].
  // Camera positioned looking down and outward so the L* axis
  // (vertical) is prominent and the a*-b* plane spreads horizontally.
  cameraLab3D = new THREE.PerspectiveCamera(45, w / h, 1, 1000);
  cameraLab3D.position.set(120, 100, 120);

  rendererLab3D = new THREE.WebGLRenderer({antialias: true});
  rendererLab3D.setPixelRatio(window.devicePixelRatio);
  rendererLab3D.setSize(w, h);
  container.appendChild(rendererLab3D.domElement);

  controlsLab3D = new THREE.OrbitControls(cameraLab3D, rendererLab3D.domElement);
  controlsLab3D.target.set(0, 50, 0); // centre of L* axis
  controlsLab3D.enableDamping = true;
  controlsLab3D.dampingFactor = 0.08;
  controlsLab3D.update();

  sceneLab3D.add(new THREE.AmbientLight(0xffffff, 0.75));
  const dl = new THREE.DirectionalLight(0xffffff, 0.7);
  dl.position.set(1, 2, 1);
  sceneLab3D.add(dl);

  // Central L* axis (neutrals, a=b=0). Runs 0→100.
  const axisGeom = new THREE.BufferGeometry();
  axisGeom.setAttribute('position',
    new THREE.Float32BufferAttribute([0, 0, 0, 0, 100, 0], 3));
  sceneLab3D.add(new THREE.Line(axisGeom,
    new THREE.LineBasicMaterial({color: 0x999999})));

  // a* and b* reference axes at L*=50 (mid-plane) so orientation is
  // clear. Red arrow along +a (red direction), yellow along +b (yellow).
  const abAxisAt = (dir, color) => {
    const g = new THREE.BufferGeometry();
    const pts = dir === 'a'
      ? [-50, 50, 0, 50, 50, 0]
      : [0, 50, -50, 0, 50, 50];
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    sceneLab3D.add(new THREE.Line(g, new THREE.LineBasicMaterial({
      color, transparent: true, opacity: 0.5,
    })));
  };
  abAxisAt('a', 0xc62828); // reddish for a-axis
  abAxisAt('b', 0xe0b800); // yellow-ish for b-axis

  // L* tick labels every 20 units (0, 20, 40, 60, 80, 100).
  for (let l = 0; l <= 100; l += 20) {
    const sp = makeTextSprite('L*=' + l, {fontSize: 30, worldSize: 6});
    sp.position.set(8, l, 0);
    sceneLab3D.add(sp);
    labelSprites.push(sp);
  }
  // Axis-direction labels on the mid-plane.
  const lblA = makeTextSprite('+a (red)', {fontSize: 28, worldSize: 8, color: '#c62828'});
  lblA.position.set(58, 50, 0);
  sceneLab3D.add(lblA);
  labelSprites.push(lblA);
  const lblAn = makeTextSprite('−a (green)', {fontSize: 28, worldSize: 8, color: '#2e7d32'});
  lblAn.position.set(-58, 50, 0);
  sceneLab3D.add(lblAn);
  labelSprites.push(lblAn);
  const lblB = makeTextSprite('+b (yellow)', {fontSize: 28, worldSize: 8, color: '#e0b800'});
  lblB.position.set(0, 50, 58);
  sceneLab3D.add(lblB);
  labelSprites.push(lblB);
  const lblBn = makeTextSprite('−b (blue)', {fontSize: 28, worldSize: 8, color: '#1565c0'});
  lblBn.position.set(0, 50, -58);
  sceneLab3D.add(lblBn);
  labelSprites.push(lblBn);

  buildChipLatticeLab3D();

  const animate = () => {
    requestAnimationFrame(animate);
    controlsLab3D.update();
    rendererLab3D.render(sceneLab3D, cameraLab3D);
  };
  animate();
}

function buildChipLatticeLab3D() {
  // Sphere per chip at its Lab coord; colour = chip's own linear-sRGB
  // (matches the Munsell 3D view). Chip Labs are already cached in
  // CHIP_LABS (built by the client-side WB code at load time).
  // Uses InstancedMesh.setColorAt (via linearRgbToTHREE which
  // handles the gamma encoding + colour-space conversion Three.js
  // needs). setColorAt allocates the internal instanceColor buffer
  // on first call — much more reliable than building the buffer
  // manually.
  // Dot radius 0.8 (Lab units) — small enough that a typical arrow of
  // ΔE 5-10 sticks out clearly past the dot edge, and neighbouring
  // chips at min-spacing (~4 units) don't overlap. Bumping this up
  // makes the lattice a solid ball with arrows invisible inside.
  const geom = new THREE.SphereGeometry(0.8, 10, 8);
  const mat = new THREE.MeshLambertMaterial();
  const mesh = new THREE.InstancedMesh(geom, mat, CHIPS.length);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < CHIPS.length; i++) {
    const [L, a, b] = CHIP_LABS[i];
    dummy.position.set(a, L, b);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
    mesh.setColorAt(i, linearRgbToTHREE(CHIPS[i].rgb));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  sceneLab3D.add(mesh);
  chipMeshLab3D = mesh;
}

function buildArrowsLab3D() {
  if (!sceneLab3D) return;
  if (arrowLinesLab3D) {
    sceneLab3D.remove(arrowLinesLab3D);
    arrowLinesLab3D.geometry.dispose();
    arrowLinesLab3D.material.dispose();
    arrowLinesLab3D = null;
  }
  const positions = [];
  const colours = [];
  for (const s of lastFiltered) {
    if (!s.measuredRgb || !s.expectedRgb) continue;
    const labExp = rgbToLab(s.expectedRgb);
    const labMea = rgbToLab(s.measuredRgb);
    positions.push(labExp[1], labExp[0], labExp[2]); // (a, L, b)
    positions.push(labMea[1], labMea[0], labMea[2]);
    // Colour by ΔL* — blue = measured darker, red = lighter,
    // matches the 2D disk convention (same deltaValueColor rules).
    const dL = labMea[0] - labExp[0];
    const t = Math.max(-1, Math.min(1, dL / 15));
    let r, g, b;
    if (t < 0) {
      const u = -t;
      r = (1 - u) * 238 + u * 0x00; g = (1 - u) * 238 + u * 0x55; b = (1 - u) * 238 + u * 0xaa;
    } else {
      const u = t;
      r = (1 - u) * 238 + u * 0xaa; g = (1 - u) * 238 + u * 0x22; b = (1 - u) * 238 + u * 0x11;
    }
    for (let k = 0; k < 2; k++) {
      colours.push(r / 255, g / 255, b / 255);
    }
  }
  if (positions.length === 0) return;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  const mat = new THREE.LineBasicMaterial({vertexColors: true, transparent: true, opacity: 0.7});
  arrowLinesLab3D = new THREE.LineSegments(geom, mat);
  sceneLab3D.add(arrowLinesLab3D);
}

function resizeLab3D() {
  const container = document.getElementById('vizLab3d');
  if (!container || !rendererLab3D) return;
  const wNew = container.clientWidth;
  const hNew = container.clientHeight;
  if (wNew === 0 || hNew === 0) return;
  cameraLab3D.aspect = wNew / hNew;
  cameraLab3D.updateProjectionMatrix();
  rendererLab3D.setSize(wNew, hNew);
}

// View switcher — mounts 3D lazily on first activation. Extensible:
// add new radio options with matching view-panel divs (id="view-X"
// value="X") and, if the view needs runtime setup, register it in
// VIEW_MOUNTS below.
const VIEW_MOUNTS = {
  '3d': () => {
    if (!scene3D) {
      setup3D();
      buildArrows3D();
    } else {
      // Second+ activation: container was display:none while hidden
      // so its width/height may have drifted from the last resize.
      resize3D();
    }
  },
  'lab-3d': () => {
    if (!sceneLab3D) {
      setupLab3D();
      buildArrowsLab3D();
    } else {
      resizeLab3D();
    }
  },
};

function activateView(name) {
  const panels = document.querySelectorAll('.view-panel');
  panels.forEach(el => {
    el.style.display = el.id === 'view-' + name ? 'block' : 'none';
  });
  const mount = VIEW_MOUNTS[name];
  if (mount) mount();
}

function initViewSwitcher() {
  document.querySelectorAll('input[name="view"]').forEach(inp => {
    inp.addEventListener('change', e => activateView(e.target.value));
  });
}

// Original render() is called on every filter change; hook the 3D
// arrows rebuild and the URL-state writeback onto the same trigger so
// the browser back/forward + shareable-link machinery stays in sync
// with the visible view (both no-ops if not yet mounted / enabled).
const _origRender = render;
render = function() {
  _origRender();
  if (scene3D) buildArrows3D();
  if (sceneLab3D) buildArrowsLab3D();
  writeStateToUrl();
};

hydrateStateFromUrl();
initControls();
initViewSwitcher();
setup2DChipHover();
// Chart type may have been hydrated from URL; sync UI visibility to
// match before the initial render so users don't briefly see the wrong
// panels on load.
applyChartTypeVisibility();
urlWriteEnabled = true;
render();
</script>
</body>
</html>
`;

fs.mkdirSync(path.dirname(outPath), {recursive: true});
fs.writeFileSync(outPath, html);
const bytes = fs.statSync(outPath).size;
process.stderr.write(
  `wrote ${outPath} (${(bytes / 1024).toFixed(0)} KB)\n`,
);
