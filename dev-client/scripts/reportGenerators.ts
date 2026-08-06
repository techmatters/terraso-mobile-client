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
    expected_linear_rgb: [number, number, number] | null;
    measured_linear_rgb: [number, number, number] | null;
    delta_e: number | null;
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
export const renderWhitemaskOverlaySvg = (cap: CaptureContext): string => {
  if (!cap.previewImage) {
    return '<div class="no-preview">(no preview available — analysis failed)</div>';
  }
  const {
    base64,
    ext,
    coordWidth: W,
    coordHeight: H,
  } = cap.previewImage;
  const parts: string[] = [];
  parts.push(
    `<image href="data:image/${ext};base64,${base64}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none"/>`,
  );

  // Chart guide rectangle — where the on-screen framing guide sits in
  // preview-image coordinates. Same math as the RN debug overlay.
  const guideRect = computeChartGuideRect(W, H);

  // White diagonal-hash annulus over the WhiteMask border-calibration
  // sample area (outer = image minus outerMargin, inner = guide plus
  // innerBuf). Uses an SVG <pattern> with an explicit slanted line
  // (three overlapping segments so the diagonal is continuous across
  // pattern tile edges). Drawn BEFORE the guide rect so the dashed
  // yellow outline stays visible on top of the hash.
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
  const outerW = W - 2 * outerMargin;
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
    `<path d="${annulusPath}" fill="url(#${patternId})" fill-rule="evenodd"/>`,
  );

  // Yellow dashed chart guide rectangle — where the tester was framing
  // the chart in the viewfinder.
  parts.push(
    `<rect x="${guideRect.x}" y="${guideRect.y}" width="${guideRect.w}" height="${guideRect.h}" stroke="#ffeb3b" stroke-width="2" stroke-dasharray="8,6" fill="none"/>`,
  );

  if (cap.outcome.kind === 'success') {
    const grid = cap.outcome.result.grid;

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
    if (grid.matchedGrid) {
      grid.matchedGrid.forEach((p, i) => {
        const fill = grid.matchedGridInliers?.[i] ? '#ffcc00' : 'none';
        parts.push(
          `<circle cx="${p.x}" cy="${p.y}" r="14" stroke="#ffcc00" stroke-width="3" fill="${fill}"/>`,
        );
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

    // Red rects on per-cell sample positions.
    for (const r of cap.outcome.result.previewRects) {
      parts.push(
        `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" stroke="#ff2020" stroke-width="2" fill="none"/>`,
      );
    }

    // Ref-card sample rect (same red as chip rects).
    const refRect = cap.outcome.result.refCardRect;
    if (refRect) {
      parts.push(
        `<rect x="${refRect.x}" y="${refRect.y}" width="${refRect.w}" height="${refRect.h}" stroke="#ff2020" stroke-width="2" fill="none"/>`,
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="whitemask-svg">${parts.join('')}</svg>`;
};

// ---- Result grid SVG -------------------------------------------------------

// Simple projection: rows = data-space rows (indexed 0..nRows-1),
// cols = data-space cols. Each cell shows expected/measured swatches
// and text. Empty grid slots (physical position with no cell) render
// as a light-gray placeholder. REF row below the grid.
export const renderResultGridSvg = (cap: CaptureContext): string => {
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
        ),
      );
    }
  }

  // REF row below the grid.
  if (jsonEntry.ref_card) {
    const refY = WB_BANNER_H + HEADER_H + CELL_H * nRows;
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
): string => {
  const bg = deltaEColor(cell.delta_e);
  const expHex = linearToHex(cell.expected_linear_rgb);
  const measHex = linearToHex(cell.measured_linear_rgb);
  const swatchH = h * 0.4;
  const swatchW = (w - 6) / 2;
  const textY = y + swatchH + 8;
  const isRef = cell.expected_notation === referenceNotation;
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
  return parts.join('');
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
};

export const renderHtmlReport = (
  meta: RunMeta,
  captures: CaptureContext[],
): string => {
  // Group by fixture (source_path). Multiple captures per fixture
  // arise when the runner sweeps several WB anchors — same DNG,
  // same registration, different post-hoc WB correction. Rendering
  // once-per-fixture keeps the report readable: one whitemask +
  // metadata table + N result grids side-by-side.
  const groups = new Map<string, CaptureContext[]>();
  for (const c of captures) {
    const key = c.jsonEntry.source_path;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  const groupList = Array.from(groups.values());
  const sections = groupList.map(g => renderFixtureSection(g)).join('\n');
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
    .whitemask-block { flex: 0 0 auto; }
    .results-block { flex: 1 1 auto; min-width: 340px; }
    .results-variants { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start; }
    .results-variants > div { flex: 1 1 400px; min-width: 340px; }
    .images { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }
    svg.whitemask-svg { width: 100%; height: auto; max-width: 640px; background: #000; }
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
  ${toc}
  ${renderLegend()}
  ${sections}
</body>
</html>
`;
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

const renderFixtureSection = (variants: CaptureContext[]): string => {
  // All variants share the same fixture / outcome / registration —
  // use the first one for the metadata + whitemask overlay.
  const first = variants[0];
  const {jsonEntry} = first;
  const isFailed = first.outcome.kind === 'failure';
  const reg = jsonEntry.registration;
  const regRows = Object.entries(reg)
    .map(
      ([k, v]) =>
        `<tr><th>${esc(k)}</th><td><code>${esc(JSON.stringify(v))}</code></td></tr>`,
    )
    .join('');
  const wbLabels = variants
    .map(v => v.jsonEntry.wb_correction?.reference ?? '(none)')
    .join(' | ');
  const resultBlocks = variants
    .map(v => {
      const label = v.jsonEntry.wb_correction?.reference ?? '(no WB)';
      const source = v.jsonEntry.wb_correction?.source ?? '';
      return `
      <div>
        <p class="variant-label"><strong>${esc(label)}</strong> <span style="color:#888">(${esc(source)})</span></p>
        ${renderResultGridSvg(v)}
      </div>`;
    })
    .join('');
  return `
<section class="capture ${isFailed ? 'failed' : 'ok'}" id="${fixtureSectionId(jsonEntry.label)}">
  <h2>${esc(jsonEntry.label)}${isFailed ? ' <span style="color:#c62828">[FAILED]</span>' : ''}</h2>
  <table class="meta">
    <tr><th>Page</th><td>${esc(jsonEntry.page)}</td></tr>
    <tr><th>Format</th><td>${esc(jsonEntry.capture_format)}</td></tr>
    <tr><th>Reference card</th><td>${esc(jsonEntry.reference_card ?? '(none)')}</td></tr>
    <tr><th>Illuminant</th><td>${esc(jsonEntry.environment.illuminant_tag ?? '(none)')}</td></tr>
    <tr><th>Tags</th><td>${esc(jsonEntry.environment.tags.join(', ') || '(none)')}</td></tr>
    <tr><th>WB anchors</th><td>${esc(wbLabels)}</td></tr>
    ${regRows}
    <tr><th>Source</th><td><code>${esc(jsonEntry.source_path)}</code></td></tr>
  </table>
  <div class="images">
    <div class="whitemask-block">
      <h3>Whitemask + overlays</h3>
      ${renderWhitemaskOverlaySvg(first)}
    </div>
    <div class="results-block">
      <h3>Result grids (per WB anchor)</h3>
      <div class="results-variants">${resultBlocks}
      </div>
    </div>
  </div>
</section>`;
};

// Local re-export so the runner can pull one type from here without
// importing pageCells directly (which it already does elsewhere).
export {pageCells};
