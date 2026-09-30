#!/usr/bin/env node
// Empirically recover the "true" linear-sRGB of a physical ref card
// (e.g. the yellow post-it) from a run.json analyzer dump.
//
// Idea: for each capture, derive a per-channel WB gain from a trusted
// neutral (greycard alone, or a least-squares fit over multiple
// neutrals), then apply that gain to the target ref card's raw
// sensor read. That transformed value is what the sensor + our
// pipeline SAY the card colour is under "true white balance". Mean
// across captures with matching filters = empirical calibration.
//
// Motivating case: the app hardcodes POST_IT_YELLOW at
// (0.9542, 0.887, 0.362). If that's off vs. what a Pixel 7 actually
// sees under a trusted neutral, then postit-anchored WB is
// systematically biased. This script quantifies the disagreement.
//
// Usage:
//   node scripts/calibrate-ref-card.mjs <run.json> [options]
// Options:
//   --target <name>     Target ref card to calibrate (default: postit)
//   --illum <bucket>    Only include captures whose fixture directory
//                       (or `lightSLUG` tag) matches this illumination
//                       bucket (e.g. sun, shade). Default: all.
//   --format <raw|photo> Filter by capture format. Default: raw.
//
// Reports empirical linear-sRGB from multiple anchor strategies:
//   greycard-only         — single-ref gain from greycard
//   whibal-only           — single-ref gain from whibal
//   auto-only             — single-ref gain from the auto-picked
//                           chart chip (per shot, from
//                           wb_correction.reference when source='auto')
//   neutrals-lsq          — least-squares fit over the three
//                           physical neutrals (greycard + whibal + white)
//   near-neutrals-lsq     — least-squares fit over EVERY chart chip
//                           whose expected linear-sRGB has
//                           max-min < NEAR_NEUTRAL_THRESHOLD. Uses
//                           the published Munsell chip colours as
//                           anchors — trustworthy since they're
//                           printed inks with characterised spectral
//                           reflectance. Excludes saturated chips
//                           whose "gain" would be dominated by hue.
//   all-anchors-lsq       — every anchor above pooled into one LSQ.
// Plus mean + std-dev + N to eyeball confidence.
//
// Threshold below which a chip's expected linear-sRGB is treated as
// "near-neutral" enough to use as a WB anchor. Max-min in linear-sRGB
// space — 0.1 keeps grey / N / near-N chips (2-3 chroma or lower)
// and drops obviously saturated ones. Tunable; smaller = stricter.
const NEAR_NEUTRAL_THRESHOLD = 0.1;

import fs from 'node:fs';
import path from 'node:path';

// Small arg parser — no external deps.
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('usage: calibrate-ref-card.mjs <run.json> [--target NAME] [--illum sun|shade] [--format raw|photo]');
  process.exit(1);
}
const runPath = args[0];
const opt = k => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : null;
};
const target = opt('--target') ?? 'postit';
const illumFilter = opt('--illum');
const formatFilter = opt('--format') ?? 'raw';

// Trusted-neutral expected linear-sRGB. Duplicated from
// analyze-fixtures.ts REF_CARD_EXPECTED so this script is
// self-contained (no ts-node needed).
const NEUTRAL_EXPECTED = {
  greycard: [0.18, 0.18, 0.18],
  whibal: [0.4, 0.4, 0.4],
  white: [0.85, 0.85, 0.85],
};
// Currently-declared target values (POST_IT_YELLOW from
// getColorFromLinearRgb.ts) for the on-screen comparison. Extend if
// calibrating something else.
const CURRENT_DECLARED = {
  postit: [0.9542, 0.887, 0.362],
};

const run = JSON.parse(fs.readFileSync(runPath, 'utf-8'));
const captures = run.captures ?? [];

// Illumination bucket from path substring or lightSLUG tag — same
// derivation the filmstrip uses (see illuminationOf in
// render-munsell-error.ts).
const illumOf = cap => {
  for (const t of cap.environment?.tags ?? []) {
    if (t.startsWith('light') && t.length > 5) return t.slice(5);
  }
  const p = (cap.source_path ?? '').toLowerCase();
  if (p.includes('direct sunlight') || p.includes('direct sun')) return 'sun';
  if (p.includes('open shade') || p.includes('shade')) return 'shade';
  if (p.includes('cloudy') || p.includes('overcast')) return 'cloudy';
  if (p.includes('indoor')) return 'indoor';
  return 'unknown';
};

// Deduplicate by (source_path, format) — analyzer emits one capture
// per WB anchor sweep, but the RAW ref-card values are identical
// across anchors of the same shutter. Keep only one representative
// per shutter so mean/std-dev aren't inflated 4-6× by anchor variants.
const seen = new Set();
const shots = [];
for (const cap of captures) {
  if (formatFilter && cap.capture_format !== formatFilter) continue;
  if (illumFilter && illumOf(cap) !== illumFilter) continue;
  const key = (cap.source_path ?? cap.label) + '|' + cap.capture_format;
  if (seen.has(key)) continue;
  seen.add(key);
  shots.push(cap);
}

const findRef = (cap, name) =>
  (cap.ref_cards ?? []).find(r => r?.name === name)?.raw_linear_rgb;

// Single-ref gain: gain[c] = expected[c] / raw[c]. Reasonable when
// the anchor is spectrally near-neutral and raw is above noise.
const singleGain = (raw, expected) => {
  if (!raw) return null;
  return [0, 1, 2].map(c => (raw[c] > 1e-6 ? expected[c] / raw[c] : 1));
};

// Multi-neutral least-squares gain — per channel, minimizes
// sum((raw_i * g - expected_i)²) over the available anchors.
// Closed form: g_c = sum(raw_ci * expected_ci) / sum(raw_ci²).
const lsqGain = anchors => {
  const num = [0, 0, 0];
  const den = [0, 0, 0];
  for (const {raw, expected} of anchors) {
    for (let c = 0; c < 3; c++) {
      num[c] += raw[c] * expected[c];
      den[c] += raw[c] * raw[c];
    }
  }
  return [0, 1, 2].map(c => (den[c] > 1e-9 ? num[c] / den[c] : 1));
};

const applyGain = (raw, gain) => [
  Math.max(0, raw[0] * gain[0]),
  Math.max(0, raw[1] * gain[1]),
  Math.max(0, raw[2] * gain[2]),
];

// One shutter's captures are stored as multiple entries in run.json
// (one per WB anchor sweep). We picked ONE representative per shutter
// above; that one may or may not be the auto-WB variant. To always
// find the auto anchor chip we scan ALL captures matching the same
// source_path + format for the one with wb_correction.source='auto'.
const capturesByShot = new Map();
for (const cap of captures) {
  const key = (cap.source_path ?? cap.label) + '|' + cap.capture_format;
  if (!capturesByShot.has(key)) capturesByShot.set(key, []);
  capturesByShot.get(key).push(cap);
};
// Find the auto-picked chart chip (raw + expected) for a shot, if
// the analyzer ran an auto WB pass for it. Returns null when auto
// wasn't run or the chip's notation didn't resolve in cells.
const findAutoAnchor = cap => {
  const key = (cap.source_path ?? cap.label) + '|' + cap.capture_format;
  const siblings = capturesByShot.get(key) ?? [];
  for (const s of siblings) {
    if (s.wb_correction?.source !== 'auto') continue;
    const notation = s.wb_correction?.reference;
    if (typeof notation !== 'string') continue;
    const cell = (s.cells ?? []).find(c => c.expected_notation === notation);
    if (cell?.raw_linear_rgb && cell?.expected_linear_rgb) {
      return {
        notation,
        raw: cell.raw_linear_rgb,
        expected: cell.expected_linear_rgb,
      };
    }
  }
  return null;
};

// Enumerate every chart chip in a shot whose expected linear-sRGB is
// near-neutral (max-min below the threshold). Uses the analyzer's
// per-cell raw + expected directly — no re-decoding needed. Returns
// [] if the shot has no cells (failed registration).
const nearNeutralChipAnchors = cap => {
  const out = [];
  for (const cell of cap.cells ?? []) {
    const e = cell.expected_linear_rgb;
    const r = cell.raw_linear_rgb;
    if (!e || !r) continue;
    const spread = Math.max(...e) - Math.min(...e);
    if (spread > NEAR_NEUTRAL_THRESHOLD) continue;
    out.push({raw: r, expected: e, notation: cell.expected_notation});
  }
  return out;
};

// Accumulate empirical target under each anchor strategy. Skip
// shots where the anchor or the target isn't available (mask
// missed one).
const buckets = {
  'greycard-only': [],
  'whibal-only': [],
  'auto-only': [],
  'neutrals-lsq': [],
  'near-neutrals-lsq': [],
  'all-anchors-lsq': [],
};
let usableShots = 0;
let shotsWithAuto = 0;
let totalNearNeutralChips = 0;
for (const cap of shots) {
  const targetRaw = findRef(cap, target);
  if (!targetRaw) continue;
  const gcRaw = findRef(cap, 'greycard');
  const wbRaw = findRef(cap, 'whibal');
  const whRaw = findRef(cap, 'white');
  const autoAnchor = findAutoAnchor(cap);
  const chipAnchors = nearNeutralChipAnchors(cap);
  usableShots++;
  if (autoAnchor) shotsWithAuto++;
  totalNearNeutralChips += chipAnchors.length;
  if (gcRaw) {
    const g = singleGain(gcRaw, NEUTRAL_EXPECTED.greycard);
    if (g) buckets['greycard-only'].push(applyGain(targetRaw, g));
  }
  if (wbRaw) {
    const g = singleGain(wbRaw, NEUTRAL_EXPECTED.whibal);
    if (g) buckets['whibal-only'].push(applyGain(targetRaw, g));
  }
  if (autoAnchor) {
    const g = singleGain(autoAnchor.raw, autoAnchor.expected);
    if (g) buckets['auto-only'].push(applyGain(targetRaw, g));
  }
  const physNeutrals = [];
  if (gcRaw) physNeutrals.push({raw: gcRaw, expected: NEUTRAL_EXPECTED.greycard});
  if (wbRaw) physNeutrals.push({raw: wbRaw, expected: NEUTRAL_EXPECTED.whibal});
  if (whRaw) physNeutrals.push({raw: whRaw, expected: NEUTRAL_EXPECTED.white});
  if (physNeutrals.length >= 2) {
    const g = lsqGain(physNeutrals);
    buckets['neutrals-lsq'].push(applyGain(targetRaw, g));
  }
  if (chipAnchors.length >= 2) {
    const g = lsqGain(chipAnchors);
    buckets['near-neutrals-lsq'].push(applyGain(targetRaw, g));
  }
  const all = [...physNeutrals, ...chipAnchors];
  if (autoAnchor) all.push({raw: autoAnchor.raw, expected: autoAnchor.expected});
  if (all.length >= 2) {
    const g = lsqGain(all);
    buckets['all-anchors-lsq'].push(applyGain(targetRaw, g));
  }
}

const meanStd = arr => {
  if (arr.length === 0) return null;
  const m = [0, 1, 2].map(
    c => arr.reduce((s, v) => s + v[c], 0) / arr.length,
  );
  const s = [0, 1, 2].map(c =>
    Math.sqrt(
      arr.reduce((s, v) => s + (v[c] - m[c]) ** 2, 0) / arr.length,
    ),
  );
  return {mean: m, std: s, n: arr.length};
};

const fmt3 = v => `(${v[0].toFixed(4)}, ${v[1].toFixed(4)}, ${v[2].toFixed(4)})`;

console.log(`\ntarget=${target} format=${formatFilter} illum=${illumFilter ?? 'all'}`);
console.log(
  `${captures.length} captures in run.json → ${shots.length} after filters → ${usableShots} with target ref-card sampled`,
);
console.log(
  `  ${shotsWithAuto}/${usableShots} shots have an auto WB anchor chip; ` +
    `${totalNearNeutralChips} near-neutral chips (max-min<${NEAR_NEUTRAL_THRESHOLD}) ` +
    `pooled across all shots\n`,
);
if (CURRENT_DECLARED[target]) {
  console.log(`declared ${target}: ${fmt3(CURRENT_DECLARED[target])}`);
}
console.log();
console.log('strategy         N     mean linear-sRGB                   std-dev');
console.log('---------------  ----  -------------------------------  -----------------------');
for (const [name, arr] of Object.entries(buckets)) {
  const s = meanStd(arr);
  if (!s) {
    console.log(`${name.padEnd(16)} ${'n/a'.padStart(4)}  (no captures matched)`);
    continue;
  }
  console.log(
    `${name.padEnd(16)} ${String(s.n).padStart(4)}  ${fmt3(s.mean)}    ${fmt3(s.std)}`,
  );
}

// Cross-anchor agreement: if the two single-ref anchors DISagree,
// the sensor's per-channel response isn't a simple gain (maybe
// there's a black offset, non-linearity, or one of the cards is
// wrong). If they agree, the empirical value is trustworthy.
const gcS = meanStd(buckets['greycard-only']);
const wbS = meanStd(buckets['whibal-only']);
if (gcS && wbS) {
  const diff = [0, 1, 2].map(c => Math.abs(gcS.mean[c] - wbS.mean[c]));
  const relDiff = [0, 1, 2].map(
    c => diff[c] / ((gcS.mean[c] + wbS.mean[c]) / 2 || 1),
  );
  console.log(`\ngreycard vs whibal disagreement: ${fmt3(diff)} (${fmt3(relDiff.map(v => v * 100))}%)`);
}

// If the target has a currently-declared value, show the shift the
// empirical estimate implies. Positive = declared UNDER-states that
// channel; negative = OVER-states.
if (CURRENT_DECLARED[target]) {
  const cur = CURRENT_DECLARED[target];
  console.log(`\nshift declared → empirical (lsq mean):`);
  const lsq = meanStd(buckets['neutrals-lsq']);
  if (lsq) {
    const shift = [0, 1, 2].map(c => lsq.mean[c] - cur[c]);
    const relShift = [0, 1, 2].map(c => (shift[c] / cur[c]) * 100);
    console.log(`  Δ = ${fmt3(shift)}`);
    console.log(`  Δ% = ${fmt3(relShift)}`);
  }
}
