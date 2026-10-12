#!/usr/bin/env node
//
// Offline optimal-exposure predictor experiment.
//
// Question this answers: given a derived exposure BRACKET (the burst's
// metered ×1 plus shutter-multiplier levels — see docs/munsell-multishot.md),
// which exposure minimises ΔE, and can we PREDICT that winner from a cheap
// single-frame feature (so we could pick it on-device instead of shooting
// the whole bracket)?
//
// It treats each physical capture (one session dir) as a "scene", groups the
// scene's shots into exposure LEVELS (ev0 = burst/×1, bracket_ev±X = the
// multiplier shots), and for each level computes:
//   - meanDE          mean ΔE2000 over non-reference, non-excluded chips
//   - clipFrac        fraction of chips whose hottest channel is saturated
//   - hiP99 / hiMax   brightest chip's hottest-channel level (highlight end)
//   - loP10           darkest chip's level           (shadow / SNR end)
//   - refHotMax       WB-anchor (reference card) hottest channel (WB-clip risk)
//   - blackNorm       loP10 / 2^stops  (black-point lift; a veiling-glare proxy)
// then it (a) marks the argmin-ΔE level, and (b) scores candidate PREDICTOR
// RULES by how often they pick that winner and the ΔE they leave on the table.
//
// With ONE scene the rule "fitting" is just a sanity check; point it at a
// directory of outdoor soil sessions (many scenes) and the hit-rate / penalty
// numbers become a real model-selection signal.
//
// Why features come from the UNCLAMPED linear RGB: that preserves values that
// ran past sensor saturation, so clipFrac / hiMax actually see the clip the
// clamped pipeline hides.
//
// Usage:
//   node scripts/munsell-exposure-experiment.js <run.json> [--ref greycard]
//        [--metric mean|median] [--light-value 6] [--out report.json]
//   produce <run.json> with:  scripts/report-munsell-fixtures.sh <dir>
//
const fs = require('fs');

// ---- args ----------------------------------------------------------------
const argv = process.argv.slice(2);
const jsonPath = argv.find(a => !a.startsWith('--'));
const opt = (name, def) => {
  const i = argv.indexOf('--' + name);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : def;
};
if (!jsonPath) {
  console.error('usage: node scripts/munsell-exposure-experiment.js <run.json> [--ref greycard] [--metric mean|median] [--out report.json]');
  process.exit(1);
}
const refArg = opt('ref', 'greycard'); // which WB anchor's ΔE to analyse
const metricName = opt('metric', 'mean'); // mean | median
const LIGHT_VALUE = parseFloat(opt('light-value', '6')); // chip value >= this = "light"
const outPath = opt('out', null);
const CLIP = 0.999; // hottest-channel level at/above which a chip is "clipped"

const J = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const caps = J.captures || [];
const excluded = new Set(J.excluded_chips || []);
// Fixtures the analyzer flagged (manually or auto WB-anchor outliers) —
// skip them so a bad-registration capture doesn't contaminate a level.
const excludedCards = new Set(J.excluded_cards || []);

// ---- small helpers -------------------------------------------------------
const mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
const median = a => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : 0.5 * (s[m - 1] + s[m]);
};
const pct = (a, p) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.max(0, Math.round((p / 100) * (s.length - 1))))];
};
const agg = metricName === 'median' ? median : mean;

// Exposure LEVEL + stop offset from a capture label. The burst (×1) and its
// synthetic average are the ev0 anchor; bracket_ev±X carry the true stops.
function levelOf(label) {
  const lo = String(label).toLowerCase();
  let m = lo.match(/bracket_ev([+-]?[0-9.]+)/);
  if (m) return {level: 'ev' + m[1], stops: parseFloat(m[1])};
  if (/burstavgof[0-9]+/.test(lo)) return {level: 'ev0(avg)', stops: 0};
  if (/burst[0-9]+of[0-9]+/.test(lo)) return {level: 'ev0(burst)', stops: 0};
  return null; // explicit manual shots etc. — not part of the bracket
}

// Scene = one physical capture setup. Prefer the session dir from the source
// path (one bracket per session); fall back to the context tokens so the
// script still groups sensibly on non-session fixtures.
function sceneOf(cap) {
  const sp = cap.source_path || '';
  const m = sp.match(/session_[0-9A-Za-z-]+/);
  if (m) return m[0];
  const env = cap.environment || {};
  return [cap.image_metadata?.model, cap.page, cap.reference_card, env.illuminant_tag]
    .filter(Boolean)
    .join('|') || 'scene';
}

// Munsell value (lightness) from an expected notation like "7.5YR 5/1".
function valueOf(notation) {
  const m = String(notation || '').match(/\s([0-9.]+)\//);
  return m ? parseFloat(m[1]) : null;
}

// Resolve the --ref shorthand to the wb_correction.reference string the
// analyzer stamped. 'self'/'in-scene' map to the page-chip neutral.
function refMatches(cap) {
  const ref = cap.wb_correction?.reference || '';
  if (refArg === 'self' || refArg === 'in-scene') {
    return !ref.startsWith('ref_card:'); // the "<page> N/1" in-scene neutral
  }
  return ref === 'ref_card:' + refArg || ref === refArg;
}

// ---- gather per-(scene, level) ------------------------------------------
// scenes: Map<sceneKey, Map<level, {stops, de[], light[], dark[], hi[], ref[]}>>
const scenes = new Map();
let usedCaps = 0;
for (const cap of caps) {
  if (cap.capture_format !== 'raw') continue;
  if (excludedCards.has(cap.label)) continue; // skip flagged / anchor-outlier captures
  if (!refMatches(cap)) continue;
  const lvl = levelOf(cap.label);
  if (!lvl) continue;
  usedCaps++;
  const sk = sceneOf(cap);
  if (!scenes.has(sk)) scenes.set(sk, new Map());
  const byLevel = scenes.get(sk);
  if (!byLevel.has(lvl.level))
    byLevel.set(lvl.level, {stops: lvl.stops, repDE: [], repLight: [], repDark: [], hi: [], ref: [], nCells: 0});
  const acc = byLevel.get(lvl.level);
  // WB-anchor headroom: the detected reference-card ROI the WB was derived
  // from (cap.ref_card). Only clamped values are stored, so this saturates
  // at 1.0 — still a usable "is the anchor near clipping" signal.
  const anchor = cap.ref_card?.raw_linear_rgb;
  if (anchor) acc.ref.push(Math.max(anchor[0], anchor[1], anchor[2]));
  // Collect THIS rep's chips, then reduce to one ΔE per rep before pooling.
  // A single failed capture (e.g. a bad registration transform) is then one
  // value the across-rep metric can reject, not a third of the pooled cells.
  const capDE = [];
  const capLight = [];
  const capDark = [];
  for (const cell of cap.cells || []) {
    if (cell.is_reference) continue; // reference chips aren't scored
    const unc = cell.raw_linear_rgb_unclamped || cell.raw_linear_rgb;
    const hot = unc ? Math.max(unc[0], unc[1], unc[2]) : null;
    if (cell.delta_e == null) continue;
    if (excluded.has(cell.expected_notation)) continue;
    if (hot != null) acc.hi.push(hot); // features stay pooled across reps
    capDE.push(cell.delta_e);
    const v = valueOf(cell.expected_notation);
    if (v != null) (v >= LIGHT_VALUE ? capLight : capDark).push(cell.delta_e);
  }
  if (capDE.length) {
    acc.repDE.push(mean(capDE));
    acc.nCells += capDE.length;
    if (capLight.length) acc.repLight.push(mean(capLight));
    if (capDark.length) acc.repDark.push(mean(capDark));
  }
}

if (!scenes.size) {
  console.error(
    `no bracket data found for --ref ${refArg} in ${jsonPath}.\n` +
      `available references: ${[...new Set(caps.map(c => c.wb_correction?.reference).filter(Boolean))].join(', ')}`,
  );
  process.exit(1);
}

// Per-(scene, level) feature record.
function featuresFor(acc) {
  // ΔE aggregates reduce per-rep first (acc.repDE), so --metric median is
  // robust to a whole failed rep; `repSpread` surfaces rep disagreement (a
  // registration-failure flag).
  return {
    stops: acc.stops,
    n: acc.nCells,
    reps: acc.repDE.length,
    meanDE: agg(acc.repDE),
    lightDE: agg(acc.repLight),
    darkDE: agg(acc.repDark),
    repSpread: acc.repDE.length > 1 ? Math.max(...acc.repDE) - Math.min(...acc.repDE) : 0,
    clipFrac: acc.hi.length ? acc.hi.filter(h => h >= CLIP).length / acc.hi.length : null,
    hiP99: pct(acc.hi, 99),
    hiMax: acc.hi.length ? Math.max(...acc.hi) : null,
    loP10: pct(acc.hi, 10),
    refHotMax: acc.ref.length ? Math.max(...acc.ref) : null,
    blackNorm: (() => {
      const lo = pct(acc.hi, 10);
      return lo == null ? null : lo / Math.pow(2, acc.stops);
    })(),
  };
}

// Build a tidy per-scene structure sorted by stops.
const sceneRecords = [...scenes.entries()].map(([key, byLevel]) => {
  const levels = [...byLevel.entries()]
    .map(([level, acc]) => ({level, ...featuresFor(acc)}))
    .sort((a, b) => a.stops - b.stops);
  const best = levels.reduce((b, l) => (l.meanDE != null && (b == null || l.meanDE < b.meanDE) ? l : b), null);
  return {key, levels, best};
});

// ---- candidate predictor rules ------------------------------------------
// Each rule picks ONE level per scene from its features; we then measure the
// ΔE penalty vs that scene's actual best level.
const brightestWhere = (levels, pred) => {
  const ok = levels.filter(pred);
  if (ok.length) return ok.reduce((b, l) => (l.stops > b.stops ? l : b));
  // nothing qualifies → safest is the darkest (least over-exposed).
  return levels.reduce((b, l) => (l.stops < b.stops ? l : b));
};
const closestStops = (levels, target) =>
  levels.reduce((b, l) => (Math.abs(l.stops - target) < Math.abs(b.stops - target) ? l : b));

const HEADROOM_TARGETS = [0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
const rules = [];
// Pure ETTR: brightest level that doesn't clip.
rules.push({name: 'ettr-no-clip', pick: L => brightestWhere(L, l => (l.clipFrac ?? 1) <= 0.01)});
// ETTR to a headroom target on the brightest chip (swept T).
for (const T of HEADROOM_TARGETS)
  rules.push({name: `hi-headroom<=${T}`, pick: L => brightestWhere(L, l => (l.hiP99 ?? 1) <= T)});
// ETTR to a headroom target on the WB anchor (swept T).
for (const T of HEADROOM_TARGETS)
  rules.push({name: `ref-headroom<=${T}`, pick: L => brightestWhere(L, l => (l.refHotMax ?? 1) <= T)});
// Fixed-offset baselines.
for (const s of [0, -0.5, -1, -2])
  rules.push({name: `fixed ev${s}`, pick: L => closestStops(L, s)});

// Score each rule across scenes.
const scored = rules.map(rule => {
  let hits = 0;
  let penalties = [];
  const picks = [];
  for (const sc of sceneRecords) {
    if (!sc.best) continue;
    const pick = rule.pick(sc.levels);
    picks.push({scene: sc.key, pick: pick.level, pickDE: pick.meanDE, best: sc.best.level, bestDE: sc.best.meanDE});
    if (pick.level === sc.best.level) hits++;
    if (pick.meanDE != null && sc.best.meanDE != null) penalties.push(pick.meanDE - sc.best.meanDE);
  }
  return {
    name: rule.name,
    hitRate: picks.length ? hits / picks.length : 0,
    meanPenalty: mean(penalties),
    maxPenalty: penalties.length ? Math.max(...penalties) : null,
    picks,
  };
});
// Rank rules by mean penalty (lower = picks closer to optimal), then hit rate.
scored.sort((a, b) => (a.meanPenalty ?? 1e9) - (b.meanPenalty ?? 1e9) || b.hitRate - a.hitRate);

// ---- report --------------------------------------------------------------
const f = (x, w = 6, d = 2) => (x == null ? '—'.padStart(w) : x.toFixed(d).padStart(w));
console.log(`\nexposure experiment · ${jsonPath}`);
console.log(`ref=${refArg}  metric=${metricName}  scenes=${sceneRecords.length}  captures=${usedCaps}  light=value>=${LIGHT_VALUE}\n`);

for (const sc of sceneRecords) {
  console.log(`SCENE ${sc.key}   (best = ${sc.best ? sc.best.level : '—'})`);
  console.log(
    '  ' +
      ['level'.padEnd(11), 'ΔE'.padStart(6), 'reps'.padStart(5), 'repSpd'.padStart(7),
       'ΔElight'.padStart(8), 'ΔEdark'.padStart(7),
       'clip%'.padStart(7), 'hiP99'.padStart(7), 'hiMax'.padStart(7), 'loP10'.padStart(7),
       'refHot'.padStart(7), 'blkNorm'.padStart(8)].join(''),
  );
  for (const l of sc.levels) {
    const star = sc.best && l.level === sc.best.level ? ' *' : '  ';
    console.log(
      star +
        l.level.padEnd(11) +
        f(l.meanDE) +
        String(l.reps).padStart(5) +
        f(l.repSpread, 7, 1) +
        f(l.lightDE, 8) +
        f(l.darkDE, 7) +
        f(l.clipFrac == null ? null : l.clipFrac * 100, 7, 1) +
        f(l.hiP99, 7, 3) +
        f(l.hiMax, 7, 3) +
        f(l.loP10, 7, 3) +
        f(l.refHotMax, 7, 3) +
        f(l.blackNorm, 8, 3),
    );
  }
  console.log('');
}

console.log('PREDICTOR RULES (ranked by mean ΔE penalty vs the per-scene optimum):');
console.log('  ' + ['rule'.padEnd(20), 'hit%'.padStart(7), 'meanPen'.padStart(9), 'maxPen'.padStart(8)].join(''));
for (const r of scored) {
  console.log(
    '  ' +
      r.name.padEnd(20) +
      (r.hitRate * 100).toFixed(0).padStart(6) +
      '%' +
      f(r.meanPenalty, 9, 2) +
      f(r.maxPenalty, 8, 2),
  );
}

// The headroom target carried by the actual winners — the number a production
// rule would aim the brightest chip at. One data point per scene.
console.log('\nwinner headroom (what the optimal exposure actually looked like):');
for (const sc of sceneRecords) {
  if (!sc.best) continue;
  console.log(
    `  ${sc.key}: best=${sc.best.level}  hiP99=${f(sc.best.hiP99, 5, 3).trim()}  ` +
      `refHot=${f(sc.best.refHotMax, 5, 3).trim()}  clip%=${f(sc.best.clipFrac == null ? null : sc.best.clipFrac * 100, 4, 1).trim()}`,
  );
}

console.log(
  '\nreading it: a good single-scene check is that `ettr-no-clip` OVERshoots ' +
    '(picks too bright) whenever a pre-clipping penalty — glare, highlight\n' +
    'compression — is present, while a `hi-headroom<=T` rule with the right T ' +
    'lands on the winner. Across many scenes the best-ranked rule + the\n' +
    '"winner headroom" column tell you which feature to gate on and what target to use.\n',
);

if (outPath) {
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {ref: refArg, metric: metricName, scenes: sceneRecords, rules: scored.map(({picks, ...r}) => r)},
      null,
      2,
    ),
  );
  console.log(`wrote ${outPath}`);
}
