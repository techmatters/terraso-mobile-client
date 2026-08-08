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
  // Horizontal offset from the last column center, in colPitch units
  // ("1 1/2 times over from the color patches").
  offsetPitches: 1.5,
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

function cutRect({x, y, w, h}, rx = STYLE.cut.rx) {
  return `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(
    rx,
  )}" ry="${f(rx)}" fill="${STYLE.cut.fill}" stroke="${
    STYLE.cut.stroke
  }" stroke-width="${STYLE.cut.width}"/>`;
}

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
  els.push(text(cardCenterX, window_.y + window_.h + 0.22, 'CUT — main window'));

  els.push(cutRect(label));
  els.push(text(label.x + label.w / 2, label.y - 0.1, 'hue label'));

  // Vertical labels for the top three reference-card slots, drawn to
  // the right of each box. Slots 4-7 stay numeric-only.
  const RIGHT_CARD_LABELS = ['WhiBal', 'Post-It', 'Gray'];
  for (const sq of squares) {
    els.push(cutRect(sq));
    els.push(
      text(sq.x + sq.w / 2, sq.y + sq.h / 2 + 0.05, String(sq.n), {size: 0.14}),
    );
    const idx = sq.n - 1;
    if (idx < RIGHT_CARD_LABELS.length) {
      const tx = sq.x + sq.w + 0.15;
      const ty = sq.y + sq.h / 2;
      // rotate(-90) around (tx,ty) makes text run bottom-to-top from
      // the anchor, reading upward when the paper is right-side-up.
      els.push(
        `<text x="${f(tx)}" y="${f(ty)}" font-family="${STYLE.label.family}" ` +
          `font-size="${STYLE.label.size}" fill="${STYLE.label.color}" ` +
          `text-anchor="middle" transform="rotate(-90 ${f(tx)} ${f(ty)})">` +
          `${RIGHT_CARD_LABELS[idx]}</text>`,
      );
    }
  }

  // Dashed guides drawn AFTER cuts so they sit on top of the red fill.
  els.push(
    guideRect({x: CARD.x, y: CARD.y, w: CARD.nominalW, h: CARD.nominalH}),
  );
  els.push(
    text(
      cardCenterX,
      CARD.y - 0.5,
      `WhiBal card ${CARD.nominalW}″ × ${CARD.nominalH}″`,
    ),
  );

  if (GRID.showGuide) {
    for (const cell of gridChips) els.push(guideRect(cell));
    for (const hole of gridHoles) els.push(guideCircle(hole));
  }

  els.push(scaleBar(0.5, PAGE.h - 0.5));

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="${PAGE.w}in" height="${PAGE.h}in"
     viewBox="0 0 ${PAGE.w} ${PAGE.h}">
  <g>
    ${els.join('\n    ')}
  </g>
</svg>
`;
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
  const svgPath = join(OUT_DIR, 'munsell-card-guide.svg');
  const pdfPath = join(OUT_DIR, 'munsell-card-guide.pdf');

  writeFileSync(svgPath, buildSvg());
  console.log(`SVG  -> ${svgPath}`);

  const tool = toPdf(svgPath, pdfPath);
  if (tool) console.log(`PDF  -> ${pdfPath}  (via ${tool})`);
  else
    console.log(
      'PDF  -> skipped (install rsvg-convert, inkscape, or cairosvg).\n' +
        `       e.g.  rsvg-convert -f pdf -o "${pdfPath}" "${svgPath}"`,
    );

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
}

main();
 