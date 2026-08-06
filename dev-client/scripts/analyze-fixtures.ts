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

// Batch analyzer for Munsell chart validator fixtures. Recursively
// scans a fixtures directory for DNGs, parses each filename into
// (page, format, reference, illuminant_tag, tags), pushes the DNG
// through `analyzeMunsellChart` — same auto-registration pipeline the
// RN screen runs, wired to a Node-side `DngDecoderLike` adapter that
// spawns the standalone `dng-cli` Swift binary — then writes one
// combined JSON export document.
//
// Run:
//   npm run analyze-fixtures -- \
//     --fixtures "~/Library/.../RAW vs Processed" \
//     --out ./results/run.json \
//     [--refs "10YR 5/1,10YR 6/1"]     # default: 10YR 5/1

import {execFileSync} from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {parseArgs} from 'util';

import {
  analyzeMunsellChart,
  type MunsellChartOutcome,
} from 'terraso-mobile-client/screens/MunsellChartValidator/chartAnalysis';
import {
  computeArbitraryResult,
  computeCellResults,
  type CellMeasurement,
} from 'terraso-mobile-client/screens/MunsellChartValidator/cellResults';
import {
  type DngDecoderLike,
  type LinearRgb,
  type PreviewImage,
  type PreviewRgb,
  type Roi,
} from 'terraso-mobile-client/screens/MunsellChartValidator/dngDecoderShim';
import {
  findMunsellPage,
  MUNSELL_PAGES,
  type MunsellPage,
} from 'terraso-mobile-client/screens/MunsellChartValidator/munsellPages';

import {
  renderHtmlReport,
  type CaptureContext,
  type CaptureJsonEntry,
} from './reportGenerators';

const SCHEMA_VERSION = '0.4.0-multi-wb-anchor';
const REPORT_PREVIEW_MAX_DIM = 800;
const REPORT_PREVIEW_QUALITY = 85;

// Sentinel ref-notation labels the runner interprets specially:
//   'auto'     — pick a page-appropriate near-neutral mid-value chip.
//   'ref_card' — use the physical reference card sampled at
//                page.refCardPoint (greycard / whibal / postit) with
//                the card's known expected linear-sRGB as the anchor.
// Anything else is treated as a literal Munsell notation.
const REF_AUTO = 'auto';
const REF_CARD = 'ref_card';

// Expected linear-sRGB for each supported physical ref card. Values
// duplicated from src/model/color/getColorFromLinearRgb.ts —
// hardcoded here rather than imported to keep the runner off any RN-
// adjacent modules.
const REF_CARD_EXPECTED: Record<string, {r: number; g: number; b: number}> = {
  greycard: {r: 0.18, g: 0.18, b: 0.18},
  whibal: {r: 0.4, g: 0.4, b: 0.4},
  postit: {r: 0.9542, g: 0.887, b: 0.362},
};

// Human-facing labels — condensed versions of LINEAR_REFERENCE_NAMES
// in src/model/color/getColorFromLinearRgb.ts. Parenthetical
// qualifiers dropped so they fit in a REF cell without wrapping to
// three lines.
const REF_CARD_DISPLAY_NAMES: Record<string, string> = {
  greycard: '18% Neutral Gray Card',
  whibal: 'WhiBal G7',
  postit: '3M Post-it Yellow',
};
const DNG_CLI = path.resolve(__dirname, '../tools/dng-cli/build/dng-cli');

// ---- Node adapter for DngDecoderLike --------------------------------------

// Spawns the `dng-cli` Swift binary per method call. renderPreview is
// stubbed — it's only called after readPreviewRgb, and JS consumers
// (RN screen) use the returned URI to display; Node consumers include
// it in the JSON output but don't dereference it.
class NodeDecoder implements DngDecoderLike {
  private cliPath: string;
  private tmpDir: string;
  private ctr = 0;
  private previewCache = new Map<
    string,
    {width: number; height: number; sourceWidth: number; sourceHeight: number}
  >();

  constructor(cliPath: string) {
    this.cliPath = cliPath;
    this.tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dng-cli-'));
  }

  cleanup(): void {
    fs.rmSync(this.tmpDir, {recursive: true, force: true});
  }

  decodeDngRois(dngPath: string, rois: Roi[]): LinearRgb[] {
    const out = execFileSync(
      this.cliPath,
      ['decode-dng-rois', dngPath, JSON.stringify(rois)],
      {encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024},
    );
    return JSON.parse(out);
  }

  readPreviewRgb(dngPath: string, maxDim: number): PreviewRgb {
    const binPath = path.join(this.tmpDir, `preview-${this.ctr++}.bin`);
    const out = execFileSync(
      this.cliPath,
      ['read-preview-rgb', dngPath, String(maxDim), binPath],
      {encoding: 'utf-8'},
    );
    const header = JSON.parse(out) as {
      width: number;
      height: number;
      sourceWidth: number;
      sourceHeight: number;
    };
    const buf = fs.readFileSync(binPath);
    fs.unlinkSync(binPath);
    // Fresh ArrayBuffer so we don't hold a view into Node's shared
    // slab allocator (Node Buffer.buffer can be shared across reads).
    const ab = new Uint8Array(buf).buffer;
    this.previewCache.set(`${dngPath}::${maxDim}`, header);
    return {...header, pixels: ab};
  }

  // Not part of DngDecoderLike — dedicated helper used by the HTML
  // report to embed a display-ready image alongside the SVG overlays.
  // Format inferred from extension (.jpg = JPEG at given quality;
  // .png = lossless). Returns the encoded bytes + header dims.
  renderPreviewImage(
    dngPath: string,
    maxDim: number,
    quality = 85,
  ): {bytes: Buffer; ext: 'jpg' | 'png'; width: number; height: number} {
    const ext = 'jpg' as const;
    const outPath = path.join(this.tmpDir, `preview-${this.ctr++}.${ext}`);
    const stdout = execFileSync(
      this.cliPath,
      [
        'render-preview',
        dngPath,
        String(maxDim),
        outPath,
        String(quality),
      ],
      {encoding: 'utf-8'},
    );
    const header = JSON.parse(stdout) as {width: number; height: number};
    const bytes = fs.readFileSync(outPath);
    fs.unlinkSync(outPath);
    return {bytes, ext, width: header.width, height: header.height};
  }

  renderPreview(dngPath: string, maxDim: number): PreviewImage {
    // Stub — chartAnalysis calls readPreviewRgb first for the same
    // (dngPath, maxDim), so the dims are already in the cache. URI
    // is a sentinel; Node consumers of the analysis output don't
    // dereference it.
    const cached = this.previewCache.get(`${dngPath}::${maxDim}`);
    if (!cached) {
      throw new Error(
        `renderPreview: no cached dims for ${dngPath} @ maxDim=${maxDim}`,
      );
    }
    return {
      uri: 'node-stub://no-preview',
      width: cached.width,
      height: cached.height,
    };
  }

  decodePhotoRois(_imagePath: string, _rois: Roi[]): LinearRgb[] {
    throw new Error(
      'decodePhotoRois not implemented in Node CLI adapter (RAW-only for now)',
    );
  }

  readPreviewRgbPhoto(_imagePath: string, _maxDim: number): PreviewRgb {
    throw new Error(
      'readPreviewRgbPhoto not implemented in Node CLI adapter (RAW-only for now)',
    );
  }
}

// ---- Filename parser -------------------------------------------------------

type ParsedFixture = {
  path: string;
  page: string;
  format: 'raw' | 'photo';
  reference: string | null;
  illuminant_tag: string | null;
  tags: string[];
};

const PAGE_LOOKUP = new Map<string, MunsellPage>(
  MUNSELL_PAGES.map(p => [p.name.toLowerCase(), p]),
);
// Ambient historical alias — kept in case old captures show up.
PAGE_LOOKUP.set('whitepage', findMunsellPage('WHITE'));

const FORMAT_TOKENS = new Map<string, 'raw' | 'photo'>([
  ['raw', 'raw'],
  ['dng', 'raw'],
  ['jpeg', 'photo'],
  ['jpg', 'photo'],
  ['heic', 'photo'],
]);
const REFERENCE_TOKENS = new Set([
  'greycard',
  'postit',
  'whibal',
  'nothing',
  'none',
]);
const ILLUMINANT_TOKENS = new Set(['light', 'dark']);

const parseFixtureFilename = (fullPath: string): ParsedFixture | null => {
  const ext = path.extname(fullPath).slice(1).toLowerCase();
  const base = path.basename(fullPath, path.extname(fullPath));
  const tokens = base
    .split('_')
    .map(t => t.toLowerCase())
    .filter(Boolean);

  let page: string | null = null;
  let format: 'raw' | 'photo' = ext === 'dng' ? 'raw' : 'photo';
  let reference: string | null = null;
  let illuminant_tag: string | null = null;
  const tags: string[] = [];

  for (const t of tokens) {
    if (t === ext) continue; // drop redundant `_DNG` (matches extension)
    const p = PAGE_LOOKUP.get(t);
    if (p) {
      page = p.name;
      continue;
    }
    const f = FORMAT_TOKENS.get(t);
    if (f) {
      format = f;
      continue;
    }
    if (REFERENCE_TOKENS.has(t)) {
      reference = t === 'none' ? 'nothing' : t;
      continue;
    }
    if (ILLUMINANT_TOKENS.has(t)) {
      illuminant_tag = t;
      continue;
    }
    tags.push(t);
  }

  if (!page) return null;
  return {path: fullPath, page, format, reference, illuminant_tag, tags};
};

// ---- Scanner ---------------------------------------------------------------

const isDng = (name: string): boolean => name.toLowerCase().endsWith('.dng');

const scanFixtures = (root: string): ParsedFixture[] => {
  const out: ParsedFixture[] = [];
  const skipped: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && isDng(entry.name)) {
        const parsed = parseFixtureFilename(full);
        if (parsed) out.push(parsed);
        else skipped.push(full);
      }
    }
  };
  walk(root);
  for (const s of skipped) {
    process.stderr.write(`skip (no recognized page): ${s}\n`);
  }
  return out;
};

// ---- Output builders -------------------------------------------------------

const buildRegistrationBlock = (
  outcome: MunsellChartOutcome,
): Record<string, unknown> => {
  if (outcome.kind === 'failure') {
    return {
      mode: 'auto-failed',
      reason: outcome.debug.reason,
      luma_anchor: outcome.debug.lumaAnchor,
      luma_cutoff: outcome.debug.lumaCutoff,
    };
  }
  const g = outcome.result.grid;
  const inliers = g.matchedGridInliers
    ? g.matchedGridInliers.filter(Boolean).length
    : null;
  return {
    mode: g.matchedGrid ? 'auto' : 'auto-no-match',
    match_score: g.matchedScore,
    match_total: g.matchedRefCount,
    inliers,
    n_detected: g.detected.length,
    cell_size_px: {w: g.cellW, h: g.cellH},
    chart_body_bounds: g.chartBodyBounds,
  };
};

// Pick a page-appropriate WB anchor: prefer LOWEST chroma (most
// neutral — closer to a "gray card") and value nearest 5 (mid-tone).
// Score = |value - 5| + 1.5 × chroma. On standard pages (chroma>=1)
// this picks value-5 chroma-1; on GLEY pages with a neutral column
// (chroma=0) it picks the N-hue chip; on WHITE (values 8-9.5) it
// picks the brightest neutral available.
const pickAutoAnchorNotation = (
  measurements: readonly CellMeasurement[],
): string | null => {
  if (measurements.length === 0) return null;
  let best = measurements[0];
  let bestScore = Infinity;
  for (const m of measurements) {
    const score = Math.abs(m.cell.value - 5) + 1.5 * m.cell.chroma;
    if (score < bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best.cell.notation;
};

// Build a synthetic CellMeasurement backed by the physical ref card
// (greycard / whibal / postit) sampled from the DNG, so
// computeCellResults can treat it as a WB anchor exactly like any
// chart chip. Returns null when the fixture has no card, the card
// name isn't recognized, or the DNG had no sampled value.
const buildRefCardMeasurement = (
  fixture: ParsedFixture,
  outcome: MunsellChartOutcome,
): CellMeasurement | null => {
  if (!fixture.reference || fixture.reference === 'nothing') return null;
  if (outcome.kind !== 'success') return null;
  const raw = outcome.result.testSwatchLinearRgb;
  if (!raw) return null;
  const expected = REF_CARD_EXPECTED[fixture.reference];
  if (!expected) return null;
  return {
    cell: {
      hue: 'REF',
      value: 0,
      chroma: 0,
      notation: `ref_card:${fixture.reference}`,
      expectedLinearRgb: expected,
      rowIdx: -1,
      colIdx: -1,
    },
    rawLinearRgb: raw,
  };
};

// Resolve one of the runner's ref labels ('auto' | 'ref_card' | literal
// Munsell notation) into a concrete CellMeasurement to feed
// computeCellResults, plus the display notation to record in the JSON.
// Returns null when the label can't be resolved for this capture (e.g.
// 'ref_card' on a fixture with no card, or a literal notation that
// isn't present on this page).
type ResolvedAnchor = {
  displayNotation: string;
  measurement: CellMeasurement | undefined;
  // True when the anchor came from a chip on the page (so
  // is_reference lights up in the result grid); false for ref_card
  // (a synthetic anchor with no on-page cell to highlight); undefined
  // when the anchor didn't resolve.
  isOnPage?: boolean;
};

const resolveAnchor = (
  label: string,
  fixture: ParsedFixture,
  outcome: MunsellChartOutcome,
): ResolvedAnchor | null => {
  if (outcome.kind !== 'success') {
    // Failure path: still return an entry so the JSON records the
    // attempted anchor label; measurement is undefined → no WB.
    return {displayNotation: label, measurement: undefined};
  }
  const measurements = outcome.result.measurements;
  if (label === REF_AUTO) {
    const notation = pickAutoAnchorNotation(measurements);
    if (!notation) return null;
    const m = measurements.find(x => x.cell.notation === notation);
    return {displayNotation: notation, measurement: m, isOnPage: true};
  }
  if (label === REF_CARD) {
    const m = buildRefCardMeasurement(fixture, outcome);
    if (!m) return null;
    return {
      displayNotation: m.cell.notation,
      measurement: m,
      isOnPage: false,
    };
  }
  const m = measurements.find(x => x.cell.notation === label);
  return {
    displayNotation: label,
    measurement: m,
    isOnPage: m !== undefined,
  };
};

const buildCaptureEntry = (
  fixture: ParsedFixture,
  anchorLabel: string,
  anchor: ResolvedAnchor,
  outcome: MunsellChartOutcome,
): unknown => {
  const base = path.basename(fixture.path, path.extname(fixture.path));
  const sanitizedAnchor = anchor.displayNotation
    .replace(/\s+/g, '-')
    .replace(/\//g, '_')
    .replace(/:/g, '-');
  const capture_id = `${base}__${sanitizedAnchor}`;
  const common = {
    capture_id,
    label: base,
    source_path: fixture.path,
    page: fixture.page,
    capture_format: fixture.format,
    reference_card: fixture.reference,
    environment: {
      illuminant_tag: fixture.illuminant_tag,
      tags: fixture.tags,
    },
    registration: buildRegistrationBlock(outcome),
  };
  if (outcome.kind === 'failure') {
    return {...common, wb_correction: null, cells: [], ref_card: null};
  }
  const measurements: CellMeasurement[] = outcome.result.measurements;
  const results = computeCellResults(measurements, anchor.measurement, false);
  const previewRects = outcome.result.previewRects;
  const refCardRect = outcome.result.refCardRect;
  const refCardRaw = outcome.result.testSwatchLinearRgb;
  // Ref-card measured value + ΔE under the current WB anchor. On
  // ref_card variants (anchor == this card) measured ≈ expected and
  // ΔE ≈ 0 by construction. On auto variants it shows how well the
  // chip-based WB happens to match the physical card's known neutral.
  const refCardExpected =
    fixture.reference && REF_CARD_EXPECTED[fixture.reference];
  const refCardMeasurement =
    refCardRaw && refCardExpected
      ? computeArbitraryResult(
          refCardExpected,
          refCardRaw,
          anchor.measurement,
          false,
        )
      : null;
  return {
    ...common,
    wb_correction: {
      mode: 'per_channel',
      reference: anchor.displayNotation,
      // Tag which SORT of anchor this is so the report / analysis can
      // distinguish "auto-picked chip on this page" from "ref card
      // sampled from the shot".
      source:
        anchorLabel === REF_AUTO
          ? 'auto'
          : anchorLabel === REF_CARD
            ? 'ref_card'
            : 'explicit',
    },
    ref_card:
      refCardRect && refCardRaw
        ? {
            name: fixture.reference,
            display_name:
              (fixture.reference && REF_CARD_DISPLAY_NAMES[fixture.reference]) ??
              fixture.reference,
            sample_rect: refCardRect,
            raw_linear_rgb: [refCardRaw.r, refCardRaw.g, refCardRaw.b],
            expected_linear_rgb: refCardExpected
              ? [refCardExpected.r, refCardExpected.g, refCardExpected.b]
              : null,
            measured_linear_rgb: refCardMeasurement
              ? [
                  refCardMeasurement.measuredLinearRgb.r,
                  refCardMeasurement.measuredLinearRgb.g,
                  refCardMeasurement.measuredLinearRgb.b,
                ]
              : null,
            delta_e: refCardMeasurement ? refCardMeasurement.deltaE : null,
          }
        : null,
    cells: results.map((r, i) => ({
      physical_row: r.cell.rowIdx,
      physical_col: r.cell.colIdx,
      expected_notation: r.cell.notation,
      measured_notation: r.measuredMunsell,
      expected_linear_rgb: [
        r.cell.expectedLinearRgb.r,
        r.cell.expectedLinearRgb.g,
        r.cell.expectedLinearRgb.b,
      ],
      raw_linear_rgb: [
        measurements[i].rawLinearRgb.r,
        measurements[i].rawLinearRgb.g,
        measurements[i].rawLinearRgb.b,
      ],
      measured_linear_rgb: [
        r.measuredLinearRgb.r,
        r.measuredLinearRgb.g,
        r.measuredLinearRgb.b,
      ],
      delta_e: r.deltaE,
      sample_rect: previewRects[i],
      is_reference:
        anchor.isOnPage === true &&
        r.cell.notation === anchor.displayNotation,
    })),
  };
};

// ---- Main ------------------------------------------------------------------

const die = (msg: string): never => {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
};

const {values} = parseArgs({
  options: {
    fixtures: {type: 'string'},
    out: {type: 'string'},
    refs: {type: 'string'},
  },
});

const fixturesDir = values.fixtures;
const outPath = values.out;
if (!fixturesDir) die('missing --fixtures <dir>');
if (!outPath) die('missing --out <path>');

// Default: two WB anchors per fixture — an auto-picked near-neutral
// mid-value chip from the page, plus the physical reference card
// (greycard / whibal / postit) sampled from the shot. User can
// override with any comma-separated list mixing literal Munsell
// notations with the 'auto' and 'ref_card' sentinels.
const refNotations = values.refs
  ? values.refs.split(',').map(s => s.trim()).filter(Boolean)
  : [REF_AUTO, REF_CARD];

process.stderr.write(`scanning ${fixturesDir}\n`);
const fixtures = scanFixtures(fixturesDir!);
process.stderr.write(
  `found ${fixtures.length} fixture(s); refs=[${refNotations.join(', ')}]\n`,
);

const decoder = new NodeDecoder(DNG_CLI);
const captures: CaptureJsonEntry[] = [];
const captureContexts: CaptureContext[] = [];
let nSuccess = 0;
let nFailure = 0;

(async () => {
  for (const fixture of fixtures) {
    const page = findMunsellPage(fixture.page);
    const t0 = Date.now();
    let outcome: MunsellChartOutcome;
    try {
      outcome = await analyzeMunsellChart(
        decoder,
        fixture.path,
        page,
        fixture.format,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(
        `  ${path.basename(fixture.path)}  THROW: ${msg}\n`,
      );
      outcome = {
        kind: 'failure',
        debug: {
          reason: `analyzer threw: ${msg}`,
          lumaAnchor: null,
          lumaCutoff: null,
          preview: null,
          grid: {
            centers: [],
            cellW: 0,
            cellH: 0,
            detected: [],
            rawBlobs: [],
            chartBodyBounds: null,
            brightMaskSpans: [],
            chartBodyMaskSpans: [],
            matchedGrid: null,
            matchedGridInliers: null,
            matchedScore: null,
            matchedRefCount: null,
            matchedTripletDetected: null,
            matchedSampleRects: null,
          },
        },
      };
    }
    const ms = Date.now() - t0;
    if (outcome.kind === 'success') {
      nSuccess++;
    } else {
      nFailure++;
    }

    // Small display JPEG for the HTML report — separate from the
    // full-res preview the analyzer already ran. Only worth doing for
    // successful analyses (failure path has no coord system to align
    // to). Skip on JPEG-encode error so a single bad fixture doesn't
    // torpedo the whole run.
    let previewImage: CaptureContext['previewImage'] | undefined;
    if (outcome.kind === 'success') {
      try {
        const rendered = decoder.renderPreviewImage(
          fixture.path,
          REPORT_PREVIEW_MAX_DIM,
          REPORT_PREVIEW_QUALITY,
        );
        previewImage = {
          base64: rendered.bytes.toString('base64'),
          ext: rendered.ext,
          encodedWidth: rendered.width,
          encodedHeight: rendered.height,
          coordWidth: outcome.result.preview.width,
          coordHeight: outcome.result.preview.height,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(
          `    preview render failed for ${path.basename(fixture.path)}: ${msg}\n`,
        );
      }
    }

    for (const refLabel of refNotations) {
      const anchor = resolveAnchor(refLabel, fixture, outcome);
      if (!anchor) {
        process.stderr.write(
          `    skip anchor "${refLabel}" on ${path.basename(fixture.path)}: unresolvable\n`,
        );
        continue;
      }
      const jsonEntry = buildCaptureEntry(
        fixture,
        refLabel,
        anchor,
        outcome,
      ) as CaptureJsonEntry;
      captures.push(jsonEntry);
      captureContexts.push({
        jsonEntry,
        outcome,
        page,
        referenceNotation: anchor.displayNotation,
        previewImage,
      });
    }
    const status = outcome.kind === 'success' ? 'ok' : 'FAIL';
    process.stderr.write(
      `  ${path.basename(fixture.path)}  ${status} (${ms}ms × ${refNotations.length} refs)\n`,
    );
  }

  decoder.cleanup();

  const runMeta = {
    schema_version: SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    fixtures_root: fixturesDir!,
    n_fixtures: fixtures.length,
    n_success: nSuccess,
    n_failure: nFailure,
  };
  const output = {...runMeta, captures};

  fs.mkdirSync(path.dirname(outPath!), {recursive: true});
  fs.writeFileSync(outPath!, JSON.stringify(output, null, 2) + '\n');

  // HTML report next to the JSON. Derive path by swapping .json → .html
  // (or appending .html if the out arg doesn't end with .json).
  const reportPath = outPath!.endsWith('.json')
    ? outPath!.replace(/\.json$/, '.html')
    : `${outPath}.html`;
  const html = renderHtmlReport(runMeta, captureContexts);
  fs.writeFileSync(reportPath, html);
  const reportBytes = fs.statSync(reportPath).size;
  process.stderr.write(
    `wrote ${captures.length} capture(s) (${nSuccess} success, ${nFailure} failure)\n` +
      `  json:   ${outPath}\n` +
      `  report: ${reportPath}  (${(reportBytes / 1024 / 1024).toFixed(1)} MB)\n`,
  );
})().catch(err => {
  decoder.cleanup();
  die(`fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
});
