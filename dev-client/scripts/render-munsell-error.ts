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
  measured: string;
  page: string;
  // 'none' when no physical ref card was in the shot; keeps the
  // client-side grid model uniformly string-keyed.
  refCard: string;
  illuminant: string | null;
  tags: string[];
  wbSource: string | null;
  wbRef: string | null;
  fixtureLabel: string;
  deltaE: number;
  // Copied from the parent capture's registration.illumination.
  // Null when RANSAC didn't lock (no illumination stats available).
  illumUnevenness: number | null;
};

const runDoc = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
const samples: Sample[] = [];
for (const cap of runDoc.captures) {
  const cells = cap.cells;
  if (!Array.isArray(cells)) continue;
  const illumUnevenness =
    cap.registration?.illumination?.unevenness ?? null;
  for (const cell of cells) {
    if (!cell.expected_notation || !cell.measured_notation) continue;
    samples.push({
      expected: cell.expected_notation,
      measured: cell.measured_notation,
      page: cap.page,
      refCard: cap.reference_card ?? 'none',
      illuminant: cap.environment?.illuminant_tag ?? null,
      tags: cap.environment?.tags ?? [],
      wbSource: cap.wb_correction?.source ?? null,
      wbRef: cap.wb_correction?.reference ?? null,
      fixtureLabel: cap.label ?? '',
      deltaE: cell.delta_e ?? 0,
      illumUnevenness,
    });
  }
}
process.stderr.write(
  `loaded ${samples.length} samples from ${jsonPath} ` +
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
  #ctl-grid { overflow-x: auto; }
  #controls legend { padding: 0 4px; font-weight: 600; font-size: 12px;
                     color: #555; }
  #controls label { display: block; padding: 1px 0; cursor: pointer; }
  #view-switcher { display: flex; gap: 14px; align-items: center;
                   padding: 8px 16px; background: #fff;
                   border: 1px solid #ddd; border-radius: 6px;
                   margin-bottom: 12px; font-size: 13px; }
  #view-switcher .vs-label { font-weight: 600; color: #555; margin-right: 4px; }
  #view-switcher label { cursor: pointer; }
  #ref-page-grid { border-collapse: collapse; }
  #ref-page-grid th, #ref-page-grid td { border: 1px solid #eee; }
  #ref-page-grid input[type="checkbox"] { cursor: pointer; margin: 0; }
  #ref-page-grid input[type="checkbox"]:disabled { cursor: not-allowed; opacity: 0.3; }
  #ref-page-grid .cell-toggle:not(:checked) { opacity: 0.55; }
  #summary { font-size: 13px; color: #444; margin-bottom: 8px; }
  #filmstrip { display: flex; flex-wrap: wrap; gap: 12px; }
  .disk { background: #fff; border: 1px solid #ddd; border-radius: 6px;
          padding: 8px; }
  .disk h3 { margin: 0 0 4px 0; font-size: 13px; color: #444; text-align: center; }
  .disk svg { display: block; background: #fff; }
  .legend-row { display: flex; align-items: center; gap: 10px;
                font-size: 12px; color: #555; margin: 6px 0 10px 0; }
  .legend-swatch { width: 220px; height: 12px;
    background: linear-gradient(to right,
      #0055aa, #4488cc, #99bbdd, #eeeeee, #ddaa88, #cc6644, #aa2211); }
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
      <fieldset id="ctl-illum">
        <legend>Background</legend>
      </fieldset>
      <fieldset id="ctl-mode">
        <legend>Arrow mode</legend>
      </fieldset>
      <fieldset id="ctl-uneven">
        <legend>Max illum unevenness</legend>
      </fieldset>
      <fieldset id="ctl-grid">
        <legend>Ref card × Page (availability updates with Background + Max illum)</legend>
        <div style="margin-bottom: 6px; display: flex; gap: 8px;">
          <button type="button" id="grid-select-all"
            style="font-size: 11px; padding: 3px 8px; cursor: pointer;">
            Select all available</button>
          <button type="button" id="grid-deselect-all"
            style="font-size: 11px; padding: 3px 8px; cursor: pointer;">
            Deselect all</button>
        </div>
        <table id="ref-page-grid" style="border-collapse: collapse; font-size: 12px;"></table>
        <div style="font-size: 10px; color: #888; margin-top: 4px;">
          <b>self</b> column = WB was derived from a chart chip (regardless of physical card in shot).
          Other columns = the physical ref card that was in the shot.
        </div>
      </fieldset>
    </div>
  </div>

  <div class="right-panel">
    <div id="view-switcher">
      <span class="vs-label">View:</span>
      <label><input type="radio" name="view" value="per-level" checked>
        Per-level (2D disks)</label>
      <label><input type="radio" name="view" value="3d">
        3D stacked</label>
    </div>

    <div class="legend-row">
      <span>ΔValue color:</span>
      <span>−2</span>
      <span class="legend-swatch"></span>
      <span>+2</span>
      <span style="margin-left:16px">blue = predicted too dark · red = too light</span>
      <span style="margin-left:16px">×N label = N samples averaged into that chip's mean arrow</span>
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
  </div>
</div>

<script>
const SAMPLES = ${JSON.stringify(samples)};
const CHIPS = ${JSON.stringify(chips)};

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
  illum: 'all',
  mode: 'raw',
  // Max illumination unevenness (max-of-col-range, row-range across
  // matched-grid inliers). Samples from captures above this threshold
  // are hidden. Slider max = 100 = show all. Default 20 = only
  // evenly-lit captures.
  maxUneven: 20,
  // Ref card × Page grid: Map<"page|refcard", boolean>. Missing key
  // means enabled (default). Falsy means user turned that cell off.
  cellEnabled: new Map(),
};

function cellKey(page, refCard) { return page + '|' + refCard; }
function isCellEnabled(page, refCard) {
  return state.cellEnabled.get(cellKey(page, refCard)) !== false;
}
function setCellEnabled(page, refCard, enabled) {
  state.cellEnabled.set(cellKey(page, refCard), enabled);
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

function initControls() {
  const illums = ['all', ...uniqueValues(SAMPLES, 'illuminant')];
  makeRadioGroup(
    document.getElementById('ctl-illum'), 'illum',
    illums.map(v => ({value: v, label: v})),
    () => state.illum, v => { state.illum = v; updateRefPageGrid(); },
  );
  makeRadioGroup(
    document.getElementById('ctl-mode'), 'mode',
    [{value: 'raw',  label: 'Raw per-sample arrows'},
     {value: 'mean', label: 'Mean per chip (quiver)'}],
    () => state.mode, v => state.mode = v,
  );
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
    updateRefPageGrid();
    render();
  });

  initRefPageGrid();
}

// Grid columns: leading 'self' pseudo-column (WB anchor = auto,
// regardless of physical card in shot) followed by the physical
// ref-card columns discovered in the samples.
function gridColumns() {
  return ['self', ...uniqueValues(SAMPLES, 'refCard')];
}

// Ref card × Page grid. Built once at init; cell availability + row
// and column header states re-evaluated on every filter change that
// could affect availability (Background, Max illum unevenness) or on
// any change to state.cellEnabled.
function initRefPageGrid() {
  const pages = uniqueValues(SAMPLES, 'page');
  const refCards = gridColumns();
  const table = document.getElementById('ref-page-grid');
  if (!table) return;
  let html = '<thead><tr>';
  html += '<th style="padding: 4px 6px; text-align: left; font-weight: 600; color: #555;">page \\ card</th>';
  for (const rc of refCards) {
    html += '<th style="padding: 4px 6px; text-align: center; font-weight: 400; color: #555; border-bottom: 1px solid #eee;">' +
      '<div style="font-size: 11px;">' + rc + '</div>' +
      '<input type="checkbox" class="col-toggle" data-refcard="' + rc + '" title="toggle whole column">' +
      '</th>';
  }
  html += '</tr></thead><tbody>';
  for (const p of pages) {
    html += '<tr>';
    html += '<th style="padding: 2px 6px; text-align: left; font-weight: 400; color: #555; border-right: 1px solid #eee; white-space: nowrap;">' +
      '<input type="checkbox" class="row-toggle" data-page="' + p + '" title="toggle whole row"> ' +
      p + '</th>';
    for (const rc of refCards) {
      html += '<td class="grid-cell" data-page="' + p + '" data-refcard="' + rc + '" ' +
        'style="text-align: center; padding: 2px 6px;"></td>';
    }
    html += '</tr>';
  }
  html += '</tbody>';
  table.innerHTML = html;

  // Row / column toggles: click sets every cell in that dimension to
  // the checkbox's new state (indeterminate → checked). Only affects
  // AVAILABLE cells — unavailable cells stay '/'.
  table.querySelectorAll('.row-toggle').forEach(cb => {
    cb.addEventListener('change', e => {
      const p = e.target.dataset.page;
      const avail = availabilityMap();
      for (const rc of refCards) {
        if ((avail.get(cellKey(p, rc)) || 0) > 0) {
          setCellEnabled(p, rc, e.target.checked);
        }
      }
      updateRefPageGrid();
      render();
    });
  });
  table.querySelectorAll('.col-toggle').forEach(cb => {
    cb.addEventListener('change', e => {
      const rc = e.target.dataset.refcard;
      const avail = availabilityMap();
      for (const p of pages) {
        if ((avail.get(cellKey(p, rc)) || 0) > 0) {
          setCellEnabled(p, rc, e.target.checked);
        }
      }
      updateRefPageGrid();
      render();
    });
  });

  // Bulk-select buttons: "Select all available" flips every
  // currently-available cell on (leaves the '/' cells alone).
  // "Deselect all" flips every cell off, available or not.
  document.getElementById('grid-select-all').addEventListener('click', () => {
    const avail = availabilityMap();
    for (const p of pages) for (const rc of refCards) {
      if ((avail.get(cellKey(p, rc)) || 0) > 0) {
        setCellEnabled(p, rc, true);
      }
    }
    updateRefPageGrid();
    render();
  });
  document.getElementById('grid-deselect-all').addEventListener('click', () => {
    for (const p of pages) for (const rc of refCards) {
      setCellEnabled(p, rc, false);
    }
    updateRefPageGrid();
    render();
  });

  updateRefPageGrid();
}

// Count samples per (page, refCard) respecting only the filters that
// affect availability (Background + Max illum). The Ref-card × Page
// grid itself does not filter its own availability — otherwise
// turning off a cell would make it "unavailable" and unrecoverable.
// Each sample contributes to its (page, physical-refCard) cell and,
// when wbSource='auto', ALSO to the (page, 'self') pseudo-cell.
function availabilityMap() {
  const uMax = state.maxUneven === 100 ? Infinity : state.maxUneven;
  const m = new Map();
  for (const s of SAMPLES) {
    if (state.illum !== 'all' && s.illuminant !== state.illum) continue;
    if (s.illumUnevenness !== null && s.illumUnevenness > uMax) continue;
    const k = cellKey(s.page, s.refCard);
    m.set(k, (m.get(k) || 0) + 1);
    if (s.wbSource === 'auto') {
      const kSelf = cellKey(s.page, 'self');
      m.set(kSelf, (m.get(kSelf) || 0) + 1);
    }
  }
  return m;
}

function updateRefPageGrid() {
  const pages = uniqueValues(SAMPLES, 'page');
  const refCards = gridColumns();
  const avail = availabilityMap();

  // Cell contents: checkbox if available, muted '/' if not.
  for (const p of pages) {
    for (const rc of refCards) {
      const cell = document.querySelector(
        '.grid-cell[data-page="' + p + '"][data-refcard="' + rc + '"]');
      if (!cell) continue;
      const n = avail.get(cellKey(p, rc)) || 0;
      if (n === 0) {
        cell.innerHTML = '<span style="color: #ccc;" title="no samples for this combination">/</span>';
      } else {
        const checked = isCellEnabled(p, rc) ? 'checked' : '';
        cell.innerHTML = '<input type="checkbox" class="cell-toggle" ' +
          'data-page="' + p + '" data-refcard="' + rc + '" ' +
          checked + ' title="' + n + ' samples">';
      }
    }
  }
  // Re-bind cell toggles (innerHTML replaced them).
  document.querySelectorAll('#ref-page-grid .cell-toggle').forEach(cb => {
    cb.addEventListener('change', e => {
      setCellEnabled(e.target.dataset.page, e.target.dataset.refcard, e.target.checked);
      updateRefPageGrid();
      render();
    });
  });

  // Row/col header tri-state: checked if all available cells in that
  // line are enabled, indeterminate if some but not all, disabled if
  // no available cells.
  const setHeader = (cb, availCount, checkedCount) => {
    cb.disabled = availCount === 0;
    cb.checked = availCount > 0 && checkedCount === availCount;
    cb.indeterminate = checkedCount > 0 && checkedCount < availCount;
  };
  for (const p of pages) {
    const cb = document.querySelector('.row-toggle[data-page="' + p + '"]');
    if (!cb) continue;
    let a = 0, c = 0;
    for (const rc of refCards) {
      if ((avail.get(cellKey(p, rc)) || 0) === 0) continue;
      a++;
      if (isCellEnabled(p, rc)) c++;
    }
    setHeader(cb, a, c);
  }
  for (const rc of refCards) {
    const cb = document.querySelector('.col-toggle[data-refcard="' + rc + '"]');
    if (!cb) continue;
    let a = 0, c = 0;
    for (const p of pages) {
      if ((avail.get(cellKey(p, rc)) || 0) === 0) continue;
      a++;
      if (isCellEnabled(p, rc)) c++;
    }
    setHeader(cb, a, c);
  }
}

// A sample matches the grid if EITHER its (page, refCard) cell OR
// — when wbSource='auto' — its (page, 'self') cell is enabled. The
// 'self' column is a pseudo-column layered on top of the physical
// ref-card columns.
function sampleMatchesGrid(s) {
  if (isCellEnabled(s.page, s.refCard)) return true;
  if (s.wbSource === 'auto' && isCellEnabled(s.page, 'self')) return true;
  return false;
}

function filterSamples() {
  const uMax = state.maxUneven === 100 ? Infinity : state.maxUneven;
  return SAMPLES.filter(s => {
    if (state.illum !== 'all' && s.illuminant !== state.illum) return false;
    // Null unevenness (RANSAC didn't lock) → let it through; the
    // underlying sample may still be diagnostic even without the
    // per-fixture illum metric.
    if (s.illumUnevenness !== null && s.illumUnevenness > uMax) return false;
    if (!sampleMatchesGrid(s)) return false;
    return true;
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
    let sumDA = 0, sumDR = 0, sumDV = 0, n = 0;
    // Also draw raw scatter if mode = raw.
    const rawSegs = [];
    for (const s of group) {
      const mea = parseNotation(s.measured);
      if (!mea) continue;
      const expAngle = hueAngle(exp.family, exp.step);
      const meaAngle = hueAngle(mea.family, mea.step);
      // Signed angular delta, clipped to [-180, 180].
      let dA = meaAngle - expAngle;
      while (dA > 180) dA -= 360;
      while (dA < -180) dA += 360;
      const dR = mea.chroma - exp.chroma;
      const dV = mea.value - exp.value;
      sumDA += dA; sumDR += dR; sumDV += dV; n++;
      if (state.mode === 'raw') {
        const p0 = polarToXY(CX, CY, exp.chroma * R_PER_CHROMA, expAngle);
        // Same clamping as mean-mode: keep endpoint inside the disk.
        const rawR = Math.max(0,
          Math.min(MAX_CHROMA + 0.5, mea.chroma)) * R_PER_CHROMA;
        const rawAngle = Math.max(WEDGE_MIN,
          Math.min(WEDGE_MAX, expAngle + dA));
        const p1 = polarToXY(CX, CY, rawR, rawAngle);
        rawSegs.push({p0, p1, dv: dV});
      }
    }
    if (n === 0) continue;
    if (state.mode === 'raw') {
      for (const seg of rawSegs) {
        parts.push('<line x1="' + seg.p0.x + '" y1="' + seg.p0.y +
          '" x2="' + seg.p1.x + '" y2="' + seg.p1.y +
          '" stroke="' + deltaValueColor(seg.dv) +
          '" stroke-width="2" opacity="0.7"/>');
      }
      nArrows += rawSegs.length;
      continue;
    }
    const mDA = sumDA / n;
    const mDR = sumDR / n;
    const mDV = sumDV / n;
    const expAngle = hueAngle(exp.family, exp.step);
    // Clamp arrow endpoint so it stays inside the visible disk:
    //   - chroma ∈ [0, MAX_CHROMA + 0.5] — prevents polarToXY from
    //     flipping through the origin when predicted chroma is
    //     negative (arrow-through-neutral), and stops runaway arrows
    //     at high chroma.
    //   - angle ∈ [WEDGE_MIN, WEDGE_MAX] — keeps huge hue-family
    //     jumps from flying off the plot into empty space.
    const p0 = polarToXY(CX, CY, exp.chroma * R_PER_CHROMA, expAngle);
    const measuredR = Math.max(0,
      Math.min(MAX_CHROMA + 0.5, exp.chroma + mDR)) * R_PER_CHROMA;
    const measuredAngle = Math.max(WEDGE_MIN,
      Math.min(WEDGE_MAX, expAngle + mDA));
    const p1 = polarToXY(CX, CY, measuredR, measuredAngle);
    const col = deltaValueColor(mDV);
    // Distance p0→p1 in pixels — used to guard against sub-pixel
    // arrows: when the mean shift is tiny, draw a filled dot at the
    // chip so we still see the color (= ΔValue) even though there's
    // no meaningful direction to show.
    const dpx = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    if (dpx < 4) {
      parts.push('<circle cx="' + p0.x + '" cy="' + p0.y +
        '" r="4" fill="' + col +
        '" stroke="black" stroke-width="0.5"/>');
    } else {
      // Draw arrow shaft (thick, dark outline for visibility).
      parts.push('<line x1="' + p0.x + '" y1="' + p0.y +
        '" x2="' + p1.x + '" y2="' + p1.y +
        '" stroke="' + col + '" stroke-width="3.5" ' +
        'stroke-linecap="round"/>');
      // Arrowhead — triangle at p1.
      const ang = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      const AH = 8;
      const ax1 = p1.x - AH * Math.cos(ang - 0.4);
      const ay1 = p1.y - AH * Math.sin(ang - 0.4);
      const ax2 = p1.x - AH * Math.cos(ang + 0.4);
      const ay2 = p1.y - AH * Math.sin(ang + 0.4);
      parts.push('<polygon points="' + p1.x + ',' + p1.y + ' ' +
        ax1 + ',' + ay1 + ' ' + ax2 + ',' + ay2 +
        '" fill="' + col + '"/>');
    }
    // Sample-count badge above the arrow origin when >1 sample was
    // averaged into this chip's mean. "×3" = 3 samples averaged.
    if (n > 1) {
      parts.push('<text x="' + p0.x + '" y="' + (p0.y - 6) +
        '" font-size="8" fill="#666" text-anchor="middle">×' + n + '</text>');
    }
    nArrows++;
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

function render() {
  const filtered = filterSamples();
  lastFiltered = filtered; // cache for hover tooltips (2D + 3D)
  const summary = document.getElementById('summary');

  // Bin samples by ground-truth value.
  const byValue = new Map();
  for (const s of filtered) {
    const exp = parseNotation(s.expected);
    if (!exp) continue;
    const v = exp.value;
    if (!byValue.has(v)) byValue.set(v, []);
    byValue.get(v).push(s);
  }
  const values = Array.from(byValue.keys()).sort((a, b) => b - a); // top disk = high value

  summary.textContent = 'showing ' + filtered.length + ' samples across ' +
    values.length + ' value bins';

  const strip = document.getElementById('filmstrip');
  strip.innerHTML = '';
  for (const v of values) {
    const vs = byValue.get(v);
    const {svg, nArrows, nSkippedOutOfWedge} = renderDisk(v, vs);
    const div = document.createElement('div');
    div.className = 'disk';
    const skippedTag = nSkippedOutOfWedge > 0
      ? ', skipped ' + nSkippedOutOfWedge + ' GLEY' : '';
    div.innerHTML = '<h3>Value ' + v + '  (n=' + vs.length +
      ', arrows=' + nArrows + skippedTag + ')</h3>' + svg;
    strip.appendChild(div);
  }
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
// arrows rebuild onto the same trigger so 2D + 3D stay in sync
// (no-op if 3D hasn't been mounted yet).
const _origRender = render;
render = function() {
  _origRender();
  if (scene3D) buildArrows3D();
};

initControls();
initViewSwitcher();
setup2DChipHover();
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
