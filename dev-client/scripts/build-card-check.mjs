#!/usr/bin/env node
// Build a one-page HTML index showing ONE representative capture per
// Munsell card per illumination condition — used to eyeball-verify
// that the card token in each filename actually matches the card in
// the picture. Picks the burst1of5 auto JPEG of each (card × subdir)
// group since that's the "cleanest" first-frame HDR+ that's easy to
// recognise the chart on.
//
// Usage:
//   node scripts/build-card-check.mjs <fixtures-dir> [--out <path>]
//
// Default output: <fixtures-dir>/results/card-check.html.
// Opens the file in the default browser on completion.

import {execSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('usage: build-card-check.mjs <fixtures-dir> [--out <path>]');
  process.exit(1);
}
const fixturesDir = args[0];
const outIdx = args.indexOf('--out');
const outPath =
  outIdx >= 0
    ? args[outIdx + 1]
    : path.join(fixturesDir, 'results', 'card-check.html');

// Enumerate first-level subdirs. Each subdir becomes one section in
// the HTML.
const subdirs = fs
  .readdirSync(fixturesDir, {withFileTypes: true})
  .filter(d => d.isDirectory() && d.name !== 'results')
  .map(d => d.name)
  .sort();

if (subdirs.length === 0) {
  console.error(`no subdirs under ${fixturesDir}`);
  process.exit(1);
}

// Filename shape (across two conventions in this batch):
//   NN_pixel7_<CARD>_dark_refmulti_lightsun_auto_isoXX_shutXXus_burst1of5_awblock.jpg
//   NN_pixel7_<CARD>_multi_lightshade_auto_burst1of5.jpg
// The card token is always the 3rd underscore-separated element
// after the leading numeric sequence + platform slug.
const parseCard = base => {
  const parts = base.split('_');
  // Format A: NN_pixel7_CARD_... → parts[2]
  // Format B: NN_pixel7_CARD_... → parts[2] (same position)
  return parts[2] ?? null;
};

const isBurst1AutoJpeg = base => {
  if (!base.toLowerCase().endsWith('.jpg')) return false;
  const lower = base.toLowerCase();
  return lower.includes('burst1of5') && lower.includes('auto');
};

// For each subdir, group burst1of5-auto JPEGs by card token and pick
// the alphabetically-first one (deterministic across re-runs).
const pickPerSubdir = subdir => {
  const dir = path.join(fixturesDir, subdir);
  const files = fs
    .readdirSync(dir)
    .filter(f => !f.startsWith('.'))
    .filter(isBurst1AutoJpeg)
    .sort();
  const byCard = new Map();
  for (const f of files) {
    const card = parseCard(f);
    if (!card) continue;
    if (!byCard.has(card)) byCard.set(card, f);
  }
  return byCard;
};

const sections = subdirs.map(sub => ({
  subdir: sub,
  cards: pickPerSubdir(sub),
}));

const esc = s =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const fileUri = abs =>
  'file://' + abs.split('/').map(encodeURIComponent).join('/');

const cardBlock = (card, filename, subdir) => {
  const abs = path.join(fixturesDir, subdir, filename);
  return `
    <div class="card">
      <div class="card-label">${esc(card)}</div>
      <img src="${esc(fileUri(abs))}" loading="lazy" alt="${esc(filename)}">
      <div class="filename">${esc(filename)}</div>
    </div>`;
};

const sectionBlock = ({subdir, cards}) => {
  const items = [...cards.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([card, f]) => cardBlock(card, f, subdir))
    .join('');
  return `
  <section>
    <h2>${esc(subdir)} <span class="count">(${cards.size} cards)</span></h2>
    <div class="grid">${items}</div>
  </section>`;
};

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Card labels — visual check (${esc(path.basename(fixturesDir))})</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue",
                     sans-serif; margin: 20px; background: #fafafa;
                     color: #222; }
  h1 { margin: 0 0 4px 0; font-size: 20px; }
  .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
  h2 { margin: 24px 0 8px 0; font-size: 16px; }
  h2 .count { color: #888; font-weight: 400; font-size: 12px;
              margin-left: 6px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill,
          minmax(260px, 1fr)); gap: 12px; }
  .card { background: #fff; border: 1px solid #ddd; border-radius: 6px;
          overflow: hidden; }
  .card img { width: 100%; height: auto; display: block; background: #000;
              aspect-ratio: 3/4; object-fit: contain; }
  .card-label { padding: 6px 10px; font-weight: 700; font-size: 16px;
                background: #f0f0f0; border-bottom: 1px solid #ddd; }
  .filename { padding: 4px 10px 6px; font-family: monospace;
              font-size: 10px; color: #666; word-break: break-all;
              line-height: 1.3; }
</style>
</head>
<body>
<h1>Card labels — visual check</h1>
<div class="meta">${esc(fixturesDir)} · burst1 auto JPEG · one per (subdir × card)</div>
${sections.map(sectionBlock).join('')}
</body>
</html>`;

fs.mkdirSync(path.dirname(outPath), {recursive: true});
fs.writeFileSync(outPath, html);
const totals = sections
  .map(s => `${s.subdir}=${s.cards.size}`)
  .join(', ');
process.stderr.write(
  `wrote ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)}KB, ${totals})\n`,
);
try {
  execSync(`open ${JSON.stringify(outPath)}`);
} catch {
  /* opening is best-effort */
}
