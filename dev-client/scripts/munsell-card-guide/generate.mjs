#!/usr/bin/env node
//
// Munsell card placement guide — generates a print-at-100% template.
//
// Produces an 8.5" x 11" (US Letter) SVG, then converts it to PDF if a
// converter is installed. Every coordinate below is in INCHES: the SVG
// declares width="8.5in" height="11in" with viewBox="0 0 8.5 11", so one
// user unit == one inch and "print at 100% / actual size" yields a
// physically exact template.
//
// The template is a paper mask: where there is paper it covers a card,
// where there is a CUT rectangle the card (or a label on it) shows
// through. Cut lines are solid; registration/placement guides are dashed
// and light; a scale bar lets you confirm the print scale with a ruler.
//
// Usage:
//   node scripts/munsell-card-guide/generate.mjs
//   -> writes out/munsell-card-guide.svg (+ .pdf if possible)
//
// Everything is driven by CONFIG. The 6 right-side squares and the "10YR"
// label window are placeholders with sensible defaults — tweak CONFIG as
// the exact reference-card details firm up.

import {execSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, 'out');

// ---------------------------------------------------------------------------
// CONFIG — all values in inches
// ---------------------------------------------------------------------------

const PAGE = {w: 8.5, h: 11};

const CARD = {
  // Measured footprint of the Munsell soil-colour-chart card.
  nominalW: 4.4,
  nominalH: 7.23,
  // Paper laps over the card edge by this much on EVERY side, so the
  // window opening is smaller than the card and keeps it secure.
  overlap: 0.25,
  // Top-left of the nominal card footprint: centred on the page.
  // Everything else (window, grid, label, right cutouts) derives
  // from this, so the whole layout shifts with it.
  x: (PAGE.w - 4.4) / 2,
  y: (PAGE.h - 7.23) / 2,
  // Extra horizontal shift applied ONLY to the main window cutout
  // (the big solid-black rectangle). The dotted card/chip guides
  // and the numbered right-side boxes stay put — this is a paper-
  // mask trim, not a layout shift.
  windowShiftX: 0.125,
};

// The shared physical Munsell hole/chip grid, straight from munsellPages.ts:
// the app models chip centers at (col*2, row*3 - 1.5) and viewing holes at
// (col*2, row*3) in an abstract reference-grid unit. So columns are spaced
// `colStep` (2) units, rows `rowStep` (3) units — a LOCKED 2:3 pitch ratio —
// and each chip rectangle sits `chipDy` (1.5 units) ABOVE its hole (the
// "rectangle with a circle on one end"). Up to 6 columns × 7 rows.
//
// Calibrate to a real chart with ONE measurement: colPitch (center-to-center
// between columns, in inches). rowPitch is then locked to 1.5 × colPitch.
const GRID = {
  cols: 6,
  rows: 7,
  colStep: 2, // reference-grid units between columns (munsellPages.ts)
  rowStep: 3, // reference-grid units between rows
  chipDy: -1.5, // chip center offset (units) from its hole row
  // Measured colPitch (chip col center-to-center) on the physical
  // card. rowPitch is locked to 1.5× (= 0.918", matches the measured
  // 0.92" within measurement noise).
  colPitch: 0.612,
  chipW: 0.47, // chip rectangle width (inches) — nearly square on real charts
  chipH: 0.59, // chip rectangle height (excluding the viewing hole above)
  // Viewing-hole radius — measured hole diameter = 0.5".
  holeR: 0.25,
  // Absolute placement of hole (0,0) CENTRE, measured from the card's
  // top-left corner. The whole hole/chip grid pins off this: the code
  // no longer auto-centres inside the window. Derived from user's
  // measurements: LEFT of leftmost hole 0.62" + 0.25" radius, TOP of
  // first hole row 1.06" + 0.25" radius.
  hole00X: 0.87,
  hole00Y: 1.31,
  showGuide: true, // draw chip rectangles + holes dashed, for alignment
};

// Right-side cutouts (reference-card patches): chip-sized rectangles
// aligned to chip rows, shifted right for working room. Seven rows so
// every chip row on the physical chart has a reference patch beside it.
const RIGHT = {
  count: 7,
  // Horizontal offset from the last column center, in colPitch units.
  // Right-box centres sit 1.75 × colPitch past the last chip column
  // centre — a bit further than "one and a half" gives more breathing
  // room between the chart's rightmost chips and the ref-card slots.
  //
  // MUST stay in lock-step with MULTI_CARD_OFFSET_PITCHES in
  // src/screens/MunsellChartValidator/matchAlgorithm.ts — that's
  // where the app samples the physical cards this printout positions.
  offsetPitches: 1.75,
  rows: [0, 1, 2, 3, 4, 5, 6], // one per chip row on the physical chart
};

// Hue-notation window ("10YR"): sits between the window's top edge
// and the dotted card top edge (i.e., inside the paper overlap band
// above the window). Height auto-derived to exactly span that gap.
const LABEL_CUTOUT = {
  spanCols: [2, 3], // 1-based column indices it should span
};

const STYLE = {
  // Light red fill inside every cut rectangle so the reader can
  // instantly see which regions are cutouts vs. paper.
  cut: {stroke: '#000000', width: 0.012, rx: 0, fill: '#ffd6d6'},
  guide: {stroke: '#b3b3b3', width: 0.008, dash: '0.06,0.05'},
  label: {color: '#8a8a8a', size: 0.12, family: 'Helvetica, Arial, sans-serif'},
};

// ---------------------------------------------------------------------------
// Derived geometry
// ---------------------------------------------------------------------------

const window_ = {
  x: CARD.x + CARD.overlap + CARD.windowShiftX,
  y: CARD.y + CARD.overlap,
  w: CARD.nominalW - 2 * CARD.overlap,
  h: CARD.nominalH - 2 * CARD.overlap,
};
const cardCenterX = CARD.x + CARD.nominalW / 2;

// Munsell hole/chip grid, in reference-grid units scaled to inches. One unit
// = colPitch / colStep; rows are then automatically 1.5× the column pitch.
const unit = GRID.colPitch / GRID.colStep;
const rowPitch = GRID.rowStep * unit;

// Absolute placement: the reference-grid origin (hole (0,0) centre)
// lands at CARD.{x,y} + GRID.hole00{X,Y}. All chip / hole positions
// then follow from the ref-grid unit math below. No centering — the
// physical measurements pin the grid to the card exactly.
const gridOriginX = CARD.x + GRID.hole00X;
const gridOriginY = CARD.y + GRID.hole00Y;

// Physical (0-based col, row) -> page inches. Chips and holes share a column
// x; a chip's y sits chipDy units above its hole row.
const colX = c => gridOriginX + c * GRID.colStep * unit;
const holeY = r => gridOriginY + r * GRID.rowStep * unit;
const chipY = r => gridOriginY + (r * GRID.rowStep + GRID.chipDy) * unit;
const chipRect = (c, r) => ({
  x: colX(c) - GRID.chipW / 2,
  y: chipY(r) - GRID.chipH / 2,
  w: GRID.chipW,
  h: GRID.chipH,
});

// Full grid (for the dashed alignment guide): a chip rectangle + a hole.
const gridChips = [];
const gridHoles = [];
for (let r = 0; r < GRID.rows; r++)
  for (let c = 0; c < GRID.cols; c++) {
    gridChips.push(chipRect(c, r));
    // Holes sit BETWEEN chip rows (munsellPages.ts) — none below the last row.
    if (r < GRID.rows - 1)
      gridHoles.push({cx: colX(c), cy: holeY(r), r: GRID.holeR});
  }

// Six right-hand cutouts: chip-sized rectangles aligned to chip rows, offset
// right of the last column center by offsetPitches × colPitch.
const rightCenterX =
  colX(GRID.cols - 1) + RIGHT.offsetPitches * GRID.colPitch;
const squares = RIGHT.rows.slice(0, RIGHT.count).map((r, i) => ({
  x: rightCenterX - GRID.chipW / 2,
  y: chipY(r) - GRID.chipH / 2,
  w: GRID.chipW,
  h: GRID.chipH,
  n: i + 1,
}));

// Hue label window: spans the given (1-based) columns, just above the window.
const [spanA, spanB] = LABEL_CUTOUT.spanCols;
const labelLeft = colX(spanA - 1) - GRID.chipW / 2;
const labelRight = colX(spanB - 1) + GRID.chipW / 2;
// Label cutout fills the paper overlap band above the window: top
// edge on the dotted card top line, bottom edge on the window top
// line. Height = window_.y - CARD.y = CARD.overlap.
const label = {
  x: labelLeft,
  w: labelRight - labelLeft,
  y: CARD.y,
  h: window_.y - CARD.y,
};

// ---------------------------------------------------------------------------
// SVG helpers
// ---------------------------------------------------------------------------

const f = n => Number(n.toFixed(4)); // trim float noise

// Local-time "YYYY-MM-DD HH:MM" — printed under the title so a
// tester can tell at a glance whether they're holding the latest
// generated copy. Local time (not ISO/UTC) reads more naturally
// on a physical print.
function generatedStamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return (
    `generated ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    ` ${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

function cutRect({x, y, w, h}, rx = STYLE.cut.rx, fill = STYLE.cut.fill) {
  return `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(
    rx,
  )}" ry="${f(rx)}" fill="${fill}" stroke="${
    STYLE.cut.stroke
  }" stroke-width="${STYLE.cut.width}"/>`;
}

// Gamma-encode a linear-sRGB triple to a display hex string. Duplicates
// the same math as the phone-side rgbToHex — kept here so this script
// stays self-contained without dragging in any RN-adjacent code.
function linearRgbToHex(r, g, b) {
  const enc = v => {
    const c = Math.max(0, Math.min(1, v));
    const srgb =
      c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
    return Math.round(Math.max(0, Math.min(1, srgb)) * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${enc(r)}${enc(g)}${enc(b)}`;
}

// Fill colours for the three named right-side cards, gamma-encoded
// from the linear-sRGB values the mac runner uses (REF_CARD_EXPECTED
// in scripts/analyze-fixtures.ts). WhiBal ~40% grey, greycard 18%
// grey, Post-It calibrated yellow.
const NAMED_CARD_FILLS = {
  WhiBal: linearRgbToHex(0.4, 0.4, 0.4),
  'Post-It': linearRgbToHex(0.9542, 0.887, 0.362),
  Gray: linearRgbToHex(0.18, 0.18, 0.18),
  White: '#ffffff',
  White: linearRgbToHex(0.85, 0.85, 0.85),
};

function guideRect({x, y, w, h}) {
  return `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(
    h,
  )}" fill="none" stroke="${STYLE.guide.stroke}" stroke-width="${
    STYLE.guide.width
  }" stroke-dasharray="${STYLE.guide.dash}"/>`;
}

function guideCircle({cx, cy, r}) {
  return `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(
    r,
  )}" fill="none" stroke="${STYLE.guide.stroke}" stroke-width="${
    STYLE.guide.width
  }" stroke-dasharray="${STYLE.guide.dash}"/>`;
}

function text(x, y, s, {anchor = 'middle', size = STYLE.label.size} = {}) {
  return `<text x="${f(x)}" y="${f(
    y,
  )}" font-family="${STYLE.label.family}" font-size="${size}" fill="${
    STYLE.label.color
  }" text-anchor="${anchor}">${s}</text>`;
}

function line(x1, y1, x2, y2, stroke = STYLE.cut.stroke, w = STYLE.cut.width) {
  return `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(
    y2,
  )}" stroke="${stroke}" stroke-width="${w}"/>`;
}

// A short inch ruler in the bottom-left so you can verify print scale.
function scaleBar(x0, y0, inches = 4) {
  const parts = [line(x0, y0, x0 + inches, y0)];
  for (let i = 0; i <= inches; i++) {
    parts.push(line(x0 + i, y0 - 0.08, x0 + i, y0 + 0.08));
    parts.push(text(x0 + i, y0 + 0.24, String(i), {size: 0.1}));
  }
  parts.push(
    text(x0 + inches / 2, y0 - 0.16, 'Print at 100% — this ruler reads inches', {
      size: 0.11,
    }),
  );
  return parts.join('\n    ');
}

// Corner registration ticks (confirm nothing is clipped by the printer).
function cornerTicks(inset = 0.25, len = 0.2) {
  const {w, h} = PAGE;
  const s = STYLE.guide.stroke;
  const t = 0.01;
  return [
    line(inset, inset, inset + len, inset, s, t),
    line(inset, inset, inset, inset + len, s, t),
    line(w - inset, inset, w - inset - len, inset, s, t),
    line(w - inset, inset, w - inset, inset + len, s, t),
    line(inset, h - inset, inset + len, h - inset, s, t),
    line(inset, h - inset, inset, h - inset - len, s, t),
    line(w - inset, h - inset, w - inset - len, h - inset, s, t),
    line(w - inset, h - inset, w - inset, h - inset - len, s, t),
  ].join('\n    ');
}

// ---------------------------------------------------------------------------
// Build the document
// ---------------------------------------------------------------------------

// Vertical labels for the top three reference-card slots, drawn to
// the right of each box. Boxes 1-3 also get the ACTUAL colour of
// the reference they represent as their fill (WhiBal grey, Post-It
// yellow, 18% grey) so the printed template previews what card
// goes in each slot. Slots 4-7 stay numeric-only with the default
// red fill. Shared between the main (chart-side) and back
// (ref-card-holder) templates.
const RIGHT_CARD_LABELS = ['WhiBal', 'Post-It', 'Gray', 'White'];
function rightBoxesElements() {
  const els = [];
  for (const sq of squares) {
    const idx = sq.n - 1;
    const named =
      idx < RIGHT_CARD_LABELS.length ? RIGHT_CARD_LABELS[idx] : null;
    const fill = named ? NAMED_CARD_FILLS[named] : STYLE.cut.fill;
    els.push(cutRect(sq, STYLE.cut.rx, fill));
    // Numeric badge — white on the dark Gray fill, else default grey.
    const badgeColor = named === 'Gray' ? '#ffffff' : STYLE.label.color;
    els.push(
      `<text x="${f(sq.x + sq.w / 2)}" y="${f(sq.y + sq.h / 2 + 0.05)}" ` +
        `font-family="${STYLE.label.family}" font-size="0.14" ` +
        `fill="${badgeColor}" text-anchor="middle">${sq.n}</text>`,
    );
    if (named) {
      const tx = sq.x + sq.w + 0.15;
      const ty = sq.y + sq.h / 2;
      // rotate(-90) around (tx,ty) makes text run bottom-to-top from
      // the anchor, reading upward when the paper is right-side-up.
      els.push(
        `<text x="${f(tx)}" y="${f(ty)}" font-family="${STYLE.label.family}" ` +
          `font-size="${STYLE.label.size}" fill="${STYLE.label.color}" ` +
          `text-anchor="middle" transform="rotate(-90 ${f(tx)} ${f(ty)})">` +
          `${named}</text>`,
      );
    }
  }
  return els;
}

function svgDocument(bodyElements) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${PAGE.w}in" height="${PAGE.h}in"
     viewBox="0 0 ${PAGE.w} ${PAGE.h}">
  <g>
    ${bodyElements.join('\n    ')}
  </g>
</svg>
`;
}

// Back-side / ref-card-holder template: dashed card outline + the 7
// right-side boxes + the top title (so orientation is obvious).
// EVERYTHING INSIDE the card outline is intentionally blank — this
// sheet is meant to sit behind (or opposite) the chart and just
// register the ref-card slots.
function buildBackSvg() {
  const els = [];
  els.push(
    `<rect x="0" y="0" width="${PAGE.w}" height="${PAGE.h}" fill="#ffffff"/>`,
  );
  els.push(cornerTicks());
  els.push(
    guideRect({x: CARD.x, y: CARD.y, w: CARD.nominalW, h: CARD.nominalH}),
  );
  const pageCenterX = PAGE.w / 2;
  els.push(text(pageCenterX, CARD.y - 1.1, 'Munsell Soil-Color Chart'));
  els.push(
    text(pageCenterX, CARD.y - 0.9, generatedStamp(), {size: 0.1}),
  );
  els.push(text(pageCenterX, CARD.y - 0.35, '(background)'));
  els.push(...rightBoxesElements());
  // Ruler horizontally centred on the page (default 4" long, so
  // x0 = (8.5 - 4) / 2 = 2.25).
  els.push(scaleBar((PAGE.w - 4) / 2, PAGE.h - 0.5));
  return svgDocument(els);
}

function buildSvg() {
  const els = [];

  // Page background (white paper).
  els.push(
    `<rect x="0" y="0" width="${PAGE.w}" height="${PAGE.h}" fill="#ffffff"/>`,
  );

  els.push(cornerTicks());

  // Cuts FIRST so the dashed chip/hole guides below draw ON TOP of
  // the light-red fill (otherwise the fill hides the chip rectangles
  // and viewing-hole circles).
  els.push(cutRect(window_));

  els.push(cutRect(label));
  els.push(text(label.x + label.w / 2, label.y - 0.1, 'card name'));

  els.push(...rightBoxesElements());

  // Dashed guides drawn AFTER cuts so they sit on top of the red fill.
  els.push(
    guideRect({x: CARD.x, y: CARD.y, w: CARD.nominalW, h: CARD.nominalH}),
  );
  // Page title + one-line instruction. Both centred on the page
  // (not the card centre-line — the card has an asymmetric window
  // shift so its centre isn't the visual page centre).
  const pageCenterX = PAGE.w / 2;
  els.push(text(pageCenterX, CARD.y - 1.1, 'Munsell Soil-Color Chart'));
  els.push(
    text(pageCenterX, CARD.y - 0.9, generatedStamp(), {size: 0.1}),
  );
  els.push(text(pageCenterX, CARD.y - 0.35, 'Cut out all shaded areas'));

  if (GRID.showGuide) {
    for (const cell of gridChips) els.push(guideRect(cell));
    for (const hole of gridHoles) els.push(guideCircle(hole));
  }

  // Ruler horizontally centred on the page (default 4" long, so
  // x0 = (8.5 - 4) / 2 = 2.25).
  els.push(scaleBar((PAGE.w - 4) / 2, PAGE.h - 0.5));

  return svgDocument(els);
}

// Cricut-ready cut file. ONLY the cutout contours — no fills, guides,
// text, scale bar, or corner ticks (Design Space would try to cut those
// too). The whole mask is a SINGLE compound path: the 8.5×11 outer
// boundary minus every cutout (window, hue label, right-side boxes),
// with fill-rule="evenodd" so the cutouts import as holes. That lands in
// Design Space as one cut layer = the finished mask. Sized in real inches
// (width/height + viewBox) so it imports at 1:1 and overlays the printed
// guide exactly.
// includeBorder=true  -> full mask: 8.5×11 outer boundary minus every
//   cutout (even-odd), for cutting the finished matboard mask to size.
// includeBorder=false -> holes only, no perimeter cut. For test-cutting
//   into an existing 8.5×11 sheet (no unreliable edge cut) — then overlay
//   the result on the printed guide to check registration.
// Anchor square for the holes-only file: a small square cut placed INSET
// from the page origin by ~the machine's edge safety margin. It becomes the
// design's top-left corner, so when you push the design into the mat corner
// (where the machine stops it at that same margin), the net shift cancels
// and the real cutouts stay at their true page positions — letting you seat
// the paper precisely on the corner gridlines. Set `inset` to your machine's
// actual edge margin: in review-artwork, note how far from the corner the
// design stops — that's it. size 0 = off.
const ANCHOR_SQUARE = {
  size: 0.2, // ≈ 0.5 cm
  inset: 0.25, // machine edge safety margin (≈ 1/4"), read off the Make-It red cut-line
};

function buildCutSvg({includeBorder = true} = {}) {
  const rectPath = ({x, y, w, h}) =>
    `M ${f(x)} ${f(y)} H ${f(x + w)} V ${f(y + h)} H ${f(x)} Z`;
  const cutouts = [window_, label, ...squares];
  const shapes = [...cutouts];
  if (includeBorder) {
    // Bordered file: full-page outline (even-odd) trims the mask to size.
    shapes.unshift({x: 0, y: 0, w: PAGE.w, h: PAGE.h});
  } else if (ANCHOR_SQUARE.size > 0) {
    // Holes-only file: inset locating square becomes the top-left corner so
    // push-to-corner cancels the safety-margin shift.
    shapes.push({
      x: ANCHOR_SQUARE.inset,
      y: ANCHOR_SQUARE.inset,
      w: ANCHOR_SQUARE.size,
      h: ANCHOR_SQUARE.size,
    });
  }
  const d = shapes.map(rectPath).join(' ');
  return svgDocument([
    `<path d="${d}" fill="#000000" fill-rule="evenodd" stroke="none"/>`,
  ]);
}

// ---------------------------------------------------------------------------
// Emit + convert
// ---------------------------------------------------------------------------

function which(cmd) {
  try {
    execSync(`command -v ${cmd}`, {stdio: 'pipe'});
    return true;
  } catch {
    return false;
  }
}

function toPdf(svgPath, pdfPath) {
  if (which('rsvg-convert')) {
    execSync(`rsvg-convert -f pdf -o "${pdfPath}" "${svgPath}"`, {stdio: 'pipe'});
    return 'rsvg-convert';
  }
  if (which('inkscape')) {
    execSync(
      `inkscape "${svgPath}" --export-type=pdf --export-filename="${pdfPath}"`,
      {stdio: 'pipe'},
    );
    return 'inkscape';
  }
  if (which('cairosvg')) {
    execSync(`cairosvg "${svgPath}" -o "${pdfPath}"`, {stdio: 'pipe'});
    return 'cairosvg';
  }
  return null;
}

function main() {
  mkdirSync(OUT_DIR, {recursive: true});

  const outputs = [
    {name: 'munsell-card-guide', svg: buildSvg()},
    {name: 'munsell-card-guide-back', svg: buildBackSvg()},
  ];
  for (const {name, svg} of outputs) {
    const svgPath = join(OUT_DIR, `${name}.svg`);
    const pdfPath = join(OUT_DIR, `${name}.pdf`);
    writeFileSync(svgPath, svg);
    console.log(`SVG  -> ${svgPath}`);
    const tool = toPdf(svgPath, pdfPath);
    if (tool) console.log(`PDF  -> ${pdfPath}  (via ${tool})`);
    else
      console.log(
        'PDF  -> skipped (install rsvg-convert, inkscape, or cairosvg).\n' +
          `       e.g.  rsvg-convert -f pdf -o "${pdfPath}" "${svgPath}"`,
      );
  }

  // Cricut cut files — SVG only (Design Space imports SVG, not PDF).
  {
    const cutPath = join(OUT_DIR, 'munsell-card-guide.cut.svg');
    writeFileSync(cutPath, buildCutSvg({includeBorder: true}));
    console.log(`CUT  -> ${cutPath}  (full mask w/ border — cut matboard to size)`);

    const testPath = join(OUT_DIR, 'munsell-card-guide.cut-test.svg');
    writeFileSync(testPath, buildCutSvg({includeBorder: false}));
    console.log(
      `TEST -> ${testPath}  (holes only, no border — paper registration test)`,
    );
  }

  // Geometry summary so the numbers are easy to sanity-check.
  console.log('\nGeometry (inches):');
  console.log(`  page            ${PAGE.w} x ${PAGE.h}`);
  console.log(
    `  card footprint  ${CARD.nominalW} x ${CARD.nominalH}  at (${f(CARD.x)}, ${f(
      CARD.y,
    )})`,
  );
  console.log(
    `  window opening  ${f(window_.w)} x ${f(window_.h)}  at (${f(
      window_.x,
    )}, ${f(window_.y)})`,
  );
  console.log(
    `  grid            ${GRID.cols}c x ${GRID.rows}r  chip ${GRID.chipW}x${GRID.chipH}  colPitch ${f(
      GRID.colPitch,
    )}  rowPitch ${f(rowPitch)} (=1.5×)  hole r=${GRID.holeR}`,
  );
  console.log(
    `  label window    ${f(label.w)} x ${f(label.h)}  at (${f(label.x)}, ${f(
      label.y,
    )})  (above cols ${LABEL_CUTOUT.spanCols.join('–')})`,
  );
  console.log(
    `  right cutouts   ${RIGHT.count} x ${f(GRID.chipW)}x${f(GRID.chipH)}  x=${f(
      squares[0].x,
    )}  y=${f(squares[0].y)}..${f(squares.at(-1).y + squares.at(-1).h)}`,
  );

  // Bounding box of the holes-only cut (cut-test.svg). In Cricut Design
  // Space the imported design snaps to the mat's top-left, so to land the
  // holes at their true spot on an 8.5×11 sheet, set the design's
  // Position to this (X,Y) with the sheet in the mat's top-left corner.
  const cuts = [window_, label, ...squares];
  const bx = Math.min(...cuts.map(c => c.x));
  const by = Math.min(...cuts.map(c => c.y));
  const bw = Math.max(...cuts.map(c => c.x + c.w)) - bx;
  const bh = Math.max(...cuts.map(c => c.y + c.h)) - by;
  if (ANCHOR_SQUARE.size > 0) {
    console.log(
      `  cut-test        holes bbox ${f(bw)}x${f(bh)} at (${f(bx)},${f(by)})`,
    );
    console.log(
      `                  anchor square ${ANCHOR_SQUARE.size}" inset ${ANCHOR_SQUARE.inset}" (set inset = machine edge margin)`,
    );
    console.log(
      `                  -> push design into mat corner; seat paper on corner gridlines; cutouts land true`,
    );
  } else {
    console.log(
      `  cut-test bbox   ${f(bw)} x ${f(bh)}  -> Design Space Position X=${f(
        bx,
      )}" Y=${f(by)}" (sheet in mat top-left corner)`,
    );
  }
}

main();
 