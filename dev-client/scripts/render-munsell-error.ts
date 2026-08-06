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
// facet-filtered by ref card / illuminant / WB anchor / page.
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
  refCard: string | null;
  illuminant: string | null;
  tags: string[];
  wbSource: string | null;
  wbRef: string | null;
  fixtureLabel: string;
  deltaE: number;
};

const runDoc = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
const samples: Sample[] = [];
for (const cap of runDoc.captures) {
  const cells = cap.cells;
  if (!Array.isArray(cells)) continue;
  for (const cell of cells) {
    if (!cell.expected_notation || !cell.measured_notation) continue;
    samples.push({
      expected: cell.expected_notation,
      measured: cell.measured_notation,
      page: cap.page,
      refCard: cap.reference_card ?? null,
      illuminant: cap.environment?.illuminant_tag ?? null,
      tags: cap.environment?.tags ?? [],
      wbSource: cap.wb_correction?.source ?? null,
      wbRef: cap.wb_correction?.reference ?? null,
      fixtureLabel: cap.label ?? '',
      deltaE: cell.delta_e ?? 0,
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
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif;
         margin: 20px; color: #222; background: #fafafa; }
  h1 { margin: 0 0 4px 0; font-size: 20px; }
  .meta { color: #666; font-size: 12px; margin-bottom: 12px; }
  #controls { display: flex; flex-wrap: wrap; gap: 20px; padding: 12px 16px;
              background: #fff; border: 1px solid #ddd; border-radius: 6px;
              margin-bottom: 12px; align-items: flex-start; }
  #controls fieldset { border: 1px solid #ddd; padding: 6px 10px; margin: 0;
                       border-radius: 4px; font-size: 13px; }
  #controls legend { padding: 0 4px; font-weight: 600; font-size: 12px;
                     color: #555; }
  #controls label { display: block; padding: 1px 0; cursor: pointer; }
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

<div id="controls">
  <fieldset id="ctl-refcard">
    <legend>Ref card</legend>
  </fieldset>
  <fieldset id="ctl-illum">
    <legend>Illuminant</legend>
  </fieldset>
  <fieldset id="ctl-wb">
    <legend>WB source</legend>
  </fieldset>
  <fieldset id="ctl-page">
    <legend>Page</legend>
  </fieldset>
  <fieldset id="ctl-mode">
    <legend>Arrow mode</legend>
  </fieldset>
</div>

<div class="legend-row">
  <span>ΔValue color:</span>
  <span>−2</span>
  <span class="legend-swatch"></span>
  <span>+2</span>
  <span style="margin-left:16px">blue = predicted too dark · red = too light</span>
</div>

<div id="summary"></div>
<div id="filmstrip"></div>

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
  refCard: 'all',
  illum: 'all',
  wbSource: 'ref_card', // default per user preference
  pages: new Set(),     // empty = all
  mode: 'mean',
};

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
  const refCards = ['all', ...uniqueValues(SAMPLES, 'refCard')];
  makeRadioGroup(
    document.getElementById('ctl-refcard'), 'refcard',
    refCards.map(v => ({value: v, label: v})),
    () => state.refCard, v => state.refCard = v,
  );
  const illums = ['all', ...uniqueValues(SAMPLES, 'illuminant')];
  makeRadioGroup(
    document.getElementById('ctl-illum'), 'illum',
    illums.map(v => ({value: v, label: v})),
    () => state.illum, v => state.illum = v,
  );
  const wbs = ['all', ...uniqueValues(SAMPLES, 'wbSource')];
  makeRadioGroup(
    document.getElementById('ctl-wb'), 'wb',
    wbs.map(v => ({value: v, label: v})),
    () => state.wbSource, v => state.wbSource = v,
  );
  const pages = uniqueValues(SAMPLES, 'page');
  makeCheckGroup(
    document.getElementById('ctl-page'),
    pages.map(v => ({value: v, label: v})),
    () => state.pages,
    (v, on) => { if (on) state.pages.add(v); else state.pages.delete(v); },
  );
  makeRadioGroup(
    document.getElementById('ctl-mode'), 'mode',
    [{value: 'mean', label: 'Mean per chip (quiver)'},
     {value: 'raw',  label: 'Raw per-sample arrows'}],
    () => state.mode, v => state.mode = v,
  );
}

function filterSamples() {
  return SAMPLES.filter(s => {
    if (state.refCard !== 'all' && s.refCard !== state.refCard) return false;
    if (state.illum !== 'all' && s.illuminant !== state.illum) return false;
    if (state.wbSource !== 'all' && s.wbSource !== state.wbSource) return false;
    if (state.pages.size > 0 && !state.pages.has(s.page)) return false;
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

  // SVG geometry.
  const SIZE = 320;
  const CX = SIZE / 2;
  const CY = SIZE / 2 + 20; // shift down slightly to leave room for hue labels
  const MAX_CHROMA = 8;
  const R_PER_CHROMA = 30; // 8 chroma × 30 = 240px radius

  // Soil wedge: 5R to 5GY. In our anchor (10YR at 0°): 5R = -54°,
  // 10R = -36°, 5YR = -18°, 10YR = 0°, 5Y = +18°, 10Y = +36°,
  // 5GY = +54°. Plus a bit of margin on each side.
  const WEDGE_MIN = -65;
  const WEDGE_MAX = 65;

  const parts = [];

  // Concentric chroma gridlines.
  for (let c = 2; c <= MAX_CHROMA; c += 2) {
    const r = c * R_PER_CHROMA;
    // Draw as arc from WEDGE_MIN to WEDGE_MAX.
    const p0 = polarToXY(CX, CY, r, WEDGE_MIN);
    const p1 = polarToXY(CX, CY, r, WEDGE_MAX);
    parts.push('<path d="M ' + p0.x + ' ' + p0.y +
      ' A ' + r + ' ' + r + ' 0 0 1 ' + p1.x + ' ' + p1.y + '"' +
      ' fill="none" stroke="#c8c8c8" stroke-width="1.5"/>');
    // Chroma label at wedge-max angle.
    const lp = polarToXY(CX, CY, r, WEDGE_MAX + 2);
    parts.push('<text x="' + lp.x + '" y="' + lp.y +
      '" font-size="10" font-weight="bold" fill="#666" ' +
      'text-anchor="start">/' + c + '</text>');
  }

  // Radial hue gridlines every 9° in the wedge.
  for (let a = Math.ceil(WEDGE_MIN / 9) * 9; a <= WEDGE_MAX; a += 9) {
    const p1 = polarToXY(CX, CY, MAX_CHROMA * R_PER_CHROMA, a);
    parts.push('<line x1="' + CX + '" y1="' + CY + '" x2="' + p1.x + '" y2="' + p1.y +
      '" stroke="#f0f0f0" stroke-width="0.5"/>');
  }

  // Hue labels at outer arc for well-known steps.
  const HUE_LABELS = [
    {name: '5R',    family: 'R',  step: 5},
    {name: '10R',   family: 'R',  step: 10},
    {name: '5YR',   family: 'YR', step: 5},
    {name: '10YR',  family: 'YR', step: 10},
    {name: '5Y',    family: 'Y',  step: 5},
    {name: '10Y',   family: 'Y',  step: 10},
    {name: '5GY',   family: 'GY', step: 5},
  ];
  for (const h of HUE_LABELS) {
    const a = hueAngle(h.family, h.step);
    if (a < WEDGE_MIN || a > WEDGE_MAX) continue;
    const lp = polarToXY(CX, CY, MAX_CHROMA * R_PER_CHROMA + 12, a);
    parts.push('<text x="' + lp.x + '" y="' + lp.y +
      '" font-size="10" font-weight="bold" fill="#666" ' +
      'text-anchor="middle" alignment-baseline="middle">' + h.name + '</text>');
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
    // Small "n=" label at expected point if group is big.
    if (n > 1) {
      parts.push('<text x="' + p0.x + '" y="' + (p0.y - 6) +
        '" font-size="8" fill="#666" text-anchor="middle">n' + n + '</text>');
    }
    nArrows++;
  }

  // Chip lattice on TOP of arrows. Sampled chips (those an arrow
  // starts from) get a slightly larger radius + dark outline so the
  // arrow origin is unambiguous and the chip's true colour shows.
  for (const dot of chipDots) {
    const sampled = sampledNotations.has(dot.notation);
    const r = sampled ? 6 : 4.5;
    const stroke = sampled ? '#222' : '#bbb';
    const strokeW = sampled ? 1.2 : 0.5;
    parts.push('<circle cx="' + dot.x + '" cy="' + dot.y +
      '" r="' + r + '" fill="' + dot.hex +
      '" stroke="' + stroke + '" stroke-width="' + strokeW + '"/>');
  }

  return {
    svg: '<svg xmlns="http://www.w3.org/2000/svg" width="' + SIZE + '" height="' +
         (SIZE + 40) + '" viewBox="0 0 ' + SIZE + ' ' + (SIZE + 40) + '">' +
         parts.join('') + '</svg>',
    nArrows,
    nChips: binChips.length,
    nSkippedOutOfWedge,
  };
}

function render() {
  const filtered = filterSamples();
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

initControls();
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
