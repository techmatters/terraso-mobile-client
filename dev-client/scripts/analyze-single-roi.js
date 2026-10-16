#!/usr/bin/env node
//
// Single-image soil analyzer — no chart registration. You give it ONE DNG,
// a rectangle for the soil, and a rectangle for a neutral reference patch
// (+ its known neutral value); it decodes both ROIs through the same C++
// pipeline the chart analyzer uses (mean / trimmed / dominant / noclip +
// colour histogram), derives a per-channel white balance from the ref, and
// reports the soil's measured colour under every reducer plus its colour-
// cluster palette. For free-form soil scans the chart matcher can't touch.
//
// ROIs are in PREVIEW-image coordinates at --maxdim (default 1200); the tool
// prints the preview dims and (with --out) writes an HTML report with the
// ROIs overlaid so you can verify placement.
//
// Usage:
//   node scripts/analyze-single-roi.js --dng <path> \
//     --soil x,y,w,h --ref x,y,w,h [--ref-value 0.8] [--maxdim 1200] \
//     [--out report.html]
//
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const jpeg = require('jpeg-js');
const {linearRgbToMunsell, munsellToLinearRgb} = require('munsell');
// Munsell notation from post-WB linear-sRGB (same library the chart
// pipeline uses for the forward chip colours, so it's self-consistent).
const munsellOf = t => {
  try {
    return linearRgbToMunsell(t[0], t[1], t[2]).replace(/(\.\d)\d+/g, '$1');
  } catch (e) {
    return '—';
  }
};

// Decoder: 'cpp' (Android Bayer DNG, dng-cli-cpp) or 'swift' (iOS ProRAW
// DNG via CIRAWFilter, dng-cli — lossy-compressed ProRAW the C++ parser
// can't read). Swift has no noclip reducer; it falls back to mean.
const cliKind = process.argv.includes('--cli') ? process.argv[process.argv.indexOf('--cli') + 1] : 'cpp';
const CLI = path.resolve(__dirname, cliKind === 'swift' ? '../tools/dng-cli/build/dng-cli' : '../tools/dng-cli-cpp/build/dng-cli-cpp');

// ---- args ----------------------------------------------------------------
const argv = process.argv.slice(2);
const opt = (n, d) => {
  const i = argv.indexOf('--' + n);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : d;
};
const dng = opt('dng');
const soilArg = opt('soil');
const refArg = opt('ref');
const refValue = parseFloat(opt('ref-value', '0.8')); // neutral ref's linear value
const maxdim = parseInt(opt('maxdim', '1200'), 10);
const outPath = opt('out', null);
const expectedArg = opt('expected', null); // e.g. "10YR 5/2" — ground-truth Munsell
const label = opt('label', path.basename(dng || ''));
const camera = opt('camera', cliKind === 'swift' ? 'iOS' : 'Android');
const appendPath = opt('append', null); // JSONL file to append this result to
if (!dng || !soilArg || !refArg) {
  console.error('usage: node scripts/analyze-single-roi.js --dng <path> --soil x,y,w,h --ref x,y,w,h [--ref-value 0.8] [--maxdim 1200] [--out report.html]');
  process.exit(1);
}
const rect = s => {
  const [x, y, w, h] = s.split(',').map(Number);
  return {x, y, w, h};
};
const soilPrev = rect(soilArg);
const refPrev = rect(refArg);

// ---- colour helpers ------------------------------------------------------
const srgb8 = v => {
  const c = Math.max(0, Math.min(1, v));
  const g = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(g * 255);
};
const hex = t => '#' + t.map(v => ('0' + srgb8(v).toString(16)).slice(-2)).join('');
const ung6 = v6 => {
  const c = v6 / 63;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};
const lab = t => {
  const [r, g, b] = t.map(v => Math.max(0, v));
  const X = 0.4124 * r + 0.3576 * g + 0.1805 * b;
  const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const Z = 0.0193 * r + 0.1192 * g + 0.9505 * b;
  const f = u => (u > (6 / 29) ** 3 ? Math.cbrt(u) : u / (3 * (6 / 29) ** 2) + 4 / 29);
  const fx = f(X / 0.95047), fy = f(Y), fz = f(Z / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
};
// CIEDE2000 between two Lab triples.
function de2000(l1, l2) {
  const [L1, a1, b1] = l1, [L2, a2, b2] = l2;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), aC = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(aC ** 7 / (aC ** 7 + 25 ** 7)));
  const a1p = a1 * (1 + G), a2p = a2 * (1 + G);
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2), aCp = (C1p + C2p) / 2;
  const h = (ap, bp) => { if (ap === 0 && bp === 0) return 0; const x = Math.atan2(bp, ap) * 180 / Math.PI; return x < 0 ? x + 360 : x; };
  const h1 = h(a1p, b1), h2 = h(a2p, b2), dL = L2 - L1, dC = C2p - C1p;
  let dh = 0;
  if (C1p * C2p !== 0) { const d = h2 - h1; dh = d > 180 ? d - 360 : d < -180 ? d + 360 : d; }
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin(dh * Math.PI / 360);
  let ah = h1 + h2;
  if (C1p * C2p !== 0) ah = Math.abs(h1 - h2) > 180 ? (h1 + h2 + 360) / 2 : (h1 + h2) / 2;
  const T = 1 - 0.17 * Math.cos((ah - 30) * Math.PI / 180) + 0.24 * Math.cos(2 * ah * Math.PI / 180) + 0.32 * Math.cos((3 * ah + 6) * Math.PI / 180) - 0.2 * Math.cos((4 * ah - 63) * Math.PI / 180);
  const aLp = (L1 + L2) / 2, SL = 1 + 0.015 * (aLp - 50) ** 2 / Math.sqrt(20 + (aLp - 50) ** 2), SC = 1 + 0.045 * aCp, SH = 1 + 0.015 * aCp * T;
  const dTh = 30 * Math.exp(-(((ah - 275) / 25) ** 2)), RC = 2 * Math.sqrt(aCp ** 7 / (aCp ** 7 + 25 ** 7)), RT = -RC * Math.sin(2 * dTh * Math.PI / 180);
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
}
// Ground-truth colour from the expected Munsell notation (if given).
let expLin = null, expLab = null;
if (expectedArg) {
  try { expLin = munsellToLinearRgb(expectedArg.replace(/-/g, ' ')); expLab = lab(expLin); }
  catch (e) { console.error(`bad --expected "${expectedArg}": ${e.message}`); }
}

// Trimmed mean from a flat [idx,count,…] 6-bit histogram (mirror of
// analyze-fixtures.trimmedMeanFromHistogram).
function trimmedMean(flat, K = 3) {
  if (!flat || flat.length < 2) return null;
  const bins = [];
  let total = 0;
  for (let i = 0; i + 1 < flat.length; i += 2) {
    bins.push({c: [ung6((flat[i] >> 12) & 63), ung6((flat[i] >> 6) & 63), ung6(flat[i] & 63)], w: flat[i + 1]});
    total += flat[i + 1];
  }
  if (!total) return null;
  const wmed = vw => {
    const s = [...vw].sort((a, b) => a[0] - b[0]);
    let acc = 0;
    for (const [v, w] of s) { acc += w; if (acc >= total / 2) return v; }
    return s[s.length - 1][0];
  };
  const center = [0, 1, 2].map(ch => wmed(bins.map(b => [b.c[ch], b.w])));
  const dist = c => Math.hypot(c[0] - center[0], c[1] - center[1], c[2] - center[2]);
  const thr = K * wmed(bins.map(b => [dist(b.c), b.w]));
  let s = [0, 0, 0], n = 0;
  for (const b of bins) if (thr < 1e-9 || dist(b.c) <= thr) { s[0] += b.c[0] * b.w; s[1] += b.c[1] * b.w; s[2] += b.c[2] * b.w; n += b.w; }
  return n ? [s[0] / n, s[1] / n, s[2] / n] : center;
}

// Top-N colour palette (post-WB) from the histogram.
function palette(flat, gain, topN = 24) {
  if (!flat || flat.length < 2) return null;
  const pairs = [];
  let px = 0;
  for (let i = 0; i + 1 < flat.length; i += 2) { pairs.push([flat[i], flat[i + 1]]); px += flat[i + 1]; }
  pairs.sort((a, b) => b[1] - a[1]);
  const pal = pairs.slice(0, topN).map(([idx, c]) => {
    let lin = [ung6((idx >> 12) & 63), ung6((idx >> 6) & 63), ung6(idx & 63)];
    lin = [lin[0] * gain[0], lin[1] * gain[1], lin[2] * gain[2]];
    return [hex(lin), c / px];
  });
  return {pal, nc: pairs.length, px};
}

// ---- decode --------------------------------------------------------------
const binPath = path.join(require('os').tmpdir(), `soil-prev-${process.pid}.bin`);
const hdr = JSON.parse(cp.execFileSync(CLI, ['read-preview-rgb', dng, String(maxdim), binPath], {encoding: 'utf8'}));
const scale = hdr.sourceWidth / hdr.width; // preview → source (portrait space)
const toSrc = r => ({x: Math.round(r.x * scale), y: Math.round(r.y * scale), w: Math.round(r.w * scale), h: Math.round(r.h * scale)});
const soilSrc = toSrc(soilPrev), refSrc = toSrc(refPrev);
const decEnv = {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: {...process.env, DNG_CLI_EMIT_HIST: '1'}};
let soil, ref;
if (cliKind === 'swift') {
  // Swift CLI: flat ROI list, no batch endpoint.
  [soil, ref] = JSON.parse(cp.execFileSync(CLI, ['decode-dng-rois', dng, JSON.stringify([soilSrc, refSrc])], decEnv));
} else {
  [soil, ref] = JSON.parse(cp.execFileSync(CLI, ['decode-dng-rois-batch', dng, JSON.stringify([[soilSrc, refSrc]])], decEnv))[0];
}

// ---- white balance from the neutral ref ----------------------------------
const refRaw = [ref.r, ref.g, ref.b];
const gain = refRaw.map(v => (v > 1e-6 ? refValue / v : 1));
const wb = t => (t ? [t[0] * gain[0], t[1] * gain[1], t[2] * gain[2]] : null);

const reducers = {
  mean: [soil.r, soil.g, soil.b],
  trimmed: trimmedMean(soil.histogram),
  dominant: [soil.dominantR, soil.dominantG, soil.dominantB],
  noclip: soil.meanNoClipR !== undefined ? [soil.meanNoClipR, soil.meanNoClipG, soil.meanNoClipB] : null,
};

// ---- report --------------------------------------------------------------
console.log(`\nsingle-ROI soil analysis · ${path.basename(dng)}`);
console.log(`preview ${hdr.width}×${hdr.height} (source ${hdr.sourceWidth}×${hdr.sourceHeight}, scale ${scale.toFixed(2)})`);
console.log(`soil ROI (src) ${JSON.stringify(soilSrc)}  ·  ref ROI (src) ${JSON.stringify(refSrc)}`);
console.log(`ref raw [${refRaw.map(v => v.toFixed(4)).join(', ')}] → WB gain [${gain.map(v => v.toFixed(3)).join(', ')}] (ref-value ${refValue})\n`);
if (expLab) console.log(`expected: ${expectedArg}  →  ${hex(expLin)}  L*${expLab[0].toFixed(1)} a*${expLab[1].toFixed(1)} b*${expLab[2].toFixed(1)}\n`);
console.log('soil colour by reducer (post-WB):');
console.log('  reducer    Munsell       sRGB hex   L*     a*     b*' + (expLab ? '   ΔE2000' : ''));
for (const [name, raw] of Object.entries(reducers)) {
  if (!raw) { console.log(`  ${name.padEnd(10)} (unavailable)`); continue; }
  const m = wb(raw);
  const L = lab(m);
  const de = expLab ? '   ' + de2000(L, expLab).toFixed(2).padStart(6) : '';
  console.log(`  ${name.padEnd(10)} ${munsellOf(m).padEnd(13)} ${hex(m)}   ${L[0].toFixed(1).padStart(5)}  ${L[1].toFixed(1).padStart(5)}  ${L[2].toFixed(1).padStart(5)}${de}`);
}
// reducer spread (how much they disagree — the whole point on textured soil)
const labs = Object.entries(reducers).filter(([, r]) => r).map(([n, r]) => [n, lab(wb(r))]);
const base = labs.find(([n]) => n === 'mean')[1];
console.log('\nΔ from mean (ΔE76, shows reducer disagreement on this texture):');
for (const [n, L] of labs) if (n !== 'mean') console.log(`  ${n.padEnd(10)} ${Math.hypot(L[0] - base[0], L[1] - base[1], L[2] - base[2]).toFixed(2)}`);
const soilPal = palette(soil.histogram, gain);
if (soilPal) console.log(`\nsoil palette: top ${soilPal.pal.length} of ${soilPal.nc} clusters · ${soilPal.px} px · first 6: ${soilPal.pal.slice(0, 6).map(p => p[0] + '(' + (p[1] * 100).toFixed(0) + '%)').join(' ')}`);

// ---- optional result record (for the cross-image summary) ----------------
if (appendPath) {
  const rec = {
    label, camera, expected: expectedArg,
    expectedHex: expLin ? hex(expLin) : null,
    reducers: Object.fromEntries(Object.entries(reducers).filter(([, r]) => r).map(([n, r]) => {
      const m = wb(r);
      return [n, {munsell: munsellOf(m), hex: hex(m), de: expLab ? +de2000(lab(m), expLab).toFixed(2) : null}];
    })),
    report: outPath ? path.basename(outPath) : null,
  };
  fs.appendFileSync(appendPath, JSON.stringify(rec) + '\n');
}

// ---- optional HTML -------------------------------------------------------
if (outPath) {
  const rgb = fs.readFileSync(binPath);
  const W = hdr.width, H = hdr.height, rgba = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) { rgba[i * 4] = rgb[i * 3]; rgba[i * 4 + 1] = rgb[i * 3 + 1]; rgba[i * 4 + 2] = rgb[i * 3 + 2]; rgba[i * 4 + 3] = 255; }
  const jpg = jpeg.encode({data: rgba, width: W, height: H}, 85).data;
  const dataUri = 'data:image/jpeg;base64,' + Buffer.from(jpg).toString('base64');
  const expCard = expLab
    ? `<div style="text-align:center"><div style="width:60px;height:46px;border:2px solid #000;border-radius:4px;background:${hex(expLin)}"></div><div><b>expected</b></div><div style="font-size:12px;font-weight:600">${expectedArg}</div></div>`
    : '';
  const swRow = expCard + Object.entries(reducers).filter(([, r]) => r).map(([n, r]) => {
    const m = wb(r), L = lab(m);
    const de = expLab ? `<div style="font-size:12px;font-weight:700;color:#b26a00">ΔE ${de2000(L, expLab).toFixed(1)}</div>` : '';
    return `<div style="text-align:center"><div style="width:60px;height:46px;border:1px solid #888;border-radius:4px;background:${hex(m)}"></div><div>${n}</div><div style="font-size:12px;font-weight:600">${munsellOf(m)}</div>${de}<div style="font-size:11px;color:#555">${hex(m)}<br>L*${L[0].toFixed(0)} a*${L[1].toFixed(0)} b*${L[2].toFixed(0)}</div></div>`;
  }).join('');
  let palBar = '';
  if (soilPal) { let x = 0; for (const [h, f] of soilPal.pal) { palBar += `<rect x="${(x * 300).toFixed(1)}" width="${Math.max(0.5, f * 300).toFixed(1)}" height="22" fill="${h}"/>`; x += f; } }
  const ov = (r, c) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="none" stroke="${c}" stroke-width="4"/>`;
  const html = `<!DOCTYPE html><meta charset="utf8"><title>soil ${path.basename(dng)}</title>
<body style="font-family:sans-serif;max-width:860px;margin:20px auto">
<h2>${path.basename(dng)}</h2>
<p>soil reducers (post-WB from ref, ref-value ${refValue}). <b>Value/lightness depends on ref-value</b>; hue/chroma do not.</p>
<div style="display:flex;gap:16px;align-items:center;margin:10px 0">${swRow}</div>
<p>soil colour-cluster palette (top ${soilPal ? soilPal.pal.length : 0} of ${soilPal ? soilPal.nc : 0} clusters):</p>
<svg width="300" height="22" style="border:1px solid #ccc">${palBar}</svg>
<p style="margin-top:20px">ROIs (red=soil, cyan=ref):</p>
<svg viewBox="0 0 ${W} ${H}" width="${Math.min(700, W)}" style="border:1px solid #ccc"><image href="${dataUri}" width="${W}" height="${H}"/>${ov(soilPrev, '#ff2020')}${ov(refPrev, '#00c8d0')}</svg>
</body>`;
  fs.writeFileSync(outPath, html);
  console.log(`\nwrote ${outPath}`);
}
fs.unlinkSync(binPath);
