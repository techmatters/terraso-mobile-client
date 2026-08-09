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
  pageReferenceGridPoints,
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
// Parallel C++ CLI wrapping modules/dng-decoder/cpp/. Used for
// Android DNGs so mac analysis mirrors the on-device decoder byte-
// for-byte instead of routing through Apple's CIRAWFilter. See
// docs/android-raw-path.md for the "same-code-path invariant".
const DNG_CLI_CPP = path.resolve(
  __dirname,
  '../tools/dng-cli-cpp/build/dng-cli-cpp',
);

// ---- Node adapter for DngDecoderLike --------------------------------------

// Spawns the `dng-cli` Swift binary per method call. renderPreview is
// stubbed — it's only called after readPreviewRgb, and JS consumers
// (RN screen) use the returned URI to display; Node consumers include
// it in the JSON output but don't dereference it.
class NodeDecoder implements DngDecoderLike {
  // Two CLIs, one for DNG methods and one for photo methods. iOS
  // fixtures use the Swift CLI (CIRAWFilter for DNG, CIImage for
  // photo) for both. Android fixtures use the C++ CLI for DNG (byte-
  // for-byte match with the on-device Android decoder in
  // modules/dng-decoder/cpp/) but still the Swift CLI for photo —
  // JPEG decode is universal, and the C++ CLI doesn't implement it.
  private dngCliPath: string;
  private photoCliPath: string;
  private tmpDir: string;
  private ctr = 0;
  private previewCache = new Map<
    string,
    {width: number; height: number; sourceWidth: number; sourceHeight: number}
  >();

  constructor(dngCliPath: string, photoCliPath: string = dngCliPath) {
    this.dngCliPath = dngCliPath;
    this.photoCliPath = photoCliPath;
    this.tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dng-cli-'));
  }

  cleanup(): void {
    fs.rmSync(this.tmpDir, {recursive: true, force: true});
  }

  decodeDngRois(dngPath: string, rois: Roi[]): LinearRgb[] {
    const out = execFileSync(
      this.dngCliPath,
      ['decode-dng-rois', dngPath, JSON.stringify(rois)],
      {encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024},
    );
    return JSON.parse(out);
  }

  readPreviewRgb(dngPath: string, maxDim: number): PreviewRgb {
    const binPath = path.join(this.tmpDir, `preview-${this.ctr++}.bin`);
    const out = execFileSync(
      this.dngCliPath,
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
  // Format switch routes to the DNG or photo variant of the render
  // subcommand; both produce a scaled JPEG with the same layout.
  renderPreviewImage(
    imagePath: string,
    maxDim: number,
    format: 'raw' | 'photo',
    quality = 85,
  ): {bytes: Buffer; ext: 'jpg' | 'png'; width: number; height: number} {
    const ext = 'jpg' as const;
    const outPath = path.join(this.tmpDir, `preview-${this.ctr++}.${ext}`);
    const subcommand =
      format === 'raw' ? 'render-preview' : 'render-preview-photo';
    // Display-only preview for the HTML report — always routed
    // through the Swift CLI regardless of platform. The analysis
    // pixels for Android DNGs still come from the C++ CLI via
    // decodeDngRois / readPreviewRgb above; this rendering is just
    // for the report's "here's what the shot looked like" panel.
    const stdout = execFileSync(
      this.photoCliPath,
      [subcommand, imagePath, String(maxDim), outPath, String(quality)],
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

  decodePhotoRois(imagePath: string, rois: Roi[]): LinearRgb[] {
    // JPEG decode is universal — always routes through the Swift CLI
    // (CIImage). Correct for both iOS and Android JPEG fixtures.
    const out = execFileSync(
      this.photoCliPath,
      ['decode-photo-rois', imagePath, JSON.stringify(rois)],
      {encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024},
    );
    return JSON.parse(out);
  }

  readPreviewRgbPhoto(imagePath: string, maxDim: number): PreviewRgb {
    const binPath = path.join(this.tmpDir, `preview-${this.ctr++}.bin`);
    const out = execFileSync(
      this.photoCliPath,
      ['read-preview-rgb-photo', imagePath, String(maxDim), binPath],
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
    const ab = new Uint8Array(buf).buffer;
    this.previewCache.set(`${imagePath}::${maxDim}`, header);
    return {...header, pixels: ab};
  }
}

// ---- Filename parser -------------------------------------------------------

type ParsedFixture = {
  path: string;
  page: string;
  format: 'raw' | 'photo';
  // Which phone platform produced the capture — routes DNG decoding
  // through the CLI that mirrors that platform's on-device decoder.
  // 'unknown' when no platform token appeared in the filename; we
  // default to iOS for those (historical fixtures were all iOS).
  platform: 'ios' | 'android' | 'unknown';
  reference: string | null;
  illuminant_tag: string | null;
  tags: string[];
};

const PAGE_LOOKUP = new Map<string, MunsellPage>(
  MUNSELL_PAGES.map(p => [p.name.toLowerCase(), p]),
);
// Ambient historical alias — kept in case old captures show up.
PAGE_LOOKUP.set('whitepage', findMunsellPage('WHITE'));

// Old-style fixture filenames (pre-dual-format) embedded the format
// as a token ("10R_RAW_light_greycard_DNG.dng") — we now derive the
// format authoritatively from the file extension so an extracted
// .jpg sibling doesn't inherit a "RAW"/"DNG" token from its DNG
// parent's stem. These tokens are still recognised so they get
// stripped from the tags list, but they no longer influence the
// format decision.
const FORMAT_TOKENS = new Set([
  'raw',
  'dng',
  'jpeg',
  'jpg',
  'heic',
  'photo',
]);
// Physical ref cards recognised in filenames. 'multi' is a shorthand
// for "all three cards taped alongside" — the analyzer samples the
// three fixed MULTI_CARD_POINTS slots for these. 'nothing' / 'none'
// mean no card in the shot.
const REFERENCE_TOKENS = new Set([
  'greycard',
  'postit',
  'whibal',
  'nothing',
  'none',
  'multi',
]);
const ILLUMINANT_TOKENS = new Set(['light', 'dark']);
// Tokens the on-device chart-capture pipeline embeds in the filename
// stem but that don't carry analysis-relevant state:
//   - "both" — flags that the DNG has an ISP-JPEG companion (a scan
//     concern, not a per-capture concern).
//   - "ios" / "android" — source device; useful metadata but not a
//     filter dimension yet.
//   - a compact "20260808T134502" timestamp — unique per shot, not
//     an analysis dimension either.
// All three are dropped from the "tags" list so they don't clutter
// the report or the filmstrip filter.
// 'both' = paired DNG+JPEG capture flag; per-platform tokens 'ios' /
// 'android' get pulled out into ParsedFixture.platform below (they
// route the DNG decoder). Timestamps and everything else fall
// through into the free-form tags list.
const BOTH_TOKEN = 'both';
const PLATFORM_TOKENS = new Set<'ios' | 'android'>(['ios', 'android']);
const TIMESTAMP_RE = /^\d{8}t\d{4,6}$/;

const parseFixtureFilename = (fullPath: string): ParsedFixture | null => {
  const ext = path.extname(fullPath).slice(1).toLowerCase();
  const base = path.basename(fullPath, path.extname(fullPath));
  const tokens = base
    .split('_')
    .map(t => t.toLowerCase())
    .filter(Boolean);

  let page: string | null = null;
  // Format is derived from the extension only; format tokens in the
  // filename are stripped from tags but don't override this.
  const format: 'raw' | 'photo' = ext === 'dng' ? 'raw' : 'photo';
  let platform: 'ios' | 'android' | 'unknown' = 'unknown';
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
    if (FORMAT_TOKENS.has(t)) continue;
    if (REFERENCE_TOKENS.has(t)) {
      reference = t === 'none' ? 'nothing' : t;
      continue;
    }
    if (ILLUMINANT_TOKENS.has(t)) {
      illuminant_tag = t;
      continue;
    }
    if (PLATFORM_TOKENS.has(t as 'ios' | 'android')) {
      platform = t as 'ios' | 'android';
      continue;
    }
    if (t === BOTH_TOKEN) continue;
    if (TIMESTAMP_RE.test(t)) continue;
    tags.push(t);
  }

  if (!page) return null;
  return {
    path: fullPath, page, format, platform, reference, illuminant_tag, tags,
  };
};

// ---- Scanner ---------------------------------------------------------------

const isSupportedFixture = (name: string): boolean => {
  const lower = name.toLowerCase();
  return (
    lower.endsWith('.dng') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg')
  );
};

// Every iOS AVCapturePhoto DNG carries an Apple-ISP-processed JPEG
// preview in a subimage. When a DNG doesn't have a sibling .jpg on
// disk yet, extract it once (byte-for-byte copy via CGImageSource,
// no re-encode) so both pipelines can be analysed side-by-side.
// Skipped if the sibling already exists, or if the source has no
// preview subimage (rare for iOS DNGs; possible for DNGs from other
// sources — logged but not fatal).
const ensureDngJpegSibling = (dngPath: string, cli: string): void => {
  const jpgPath = dngPath.replace(/\.dng$/i, '.jpg');
  if (fs.existsSync(jpgPath)) return;
  try {
    execFileSync(cli, ['extract-dng-preview-jpeg', dngPath, jpgPath], {
      encoding: 'utf-8',
    });
    process.stderr.write(
      `  extracted preview JPEG: ${path.basename(jpgPath)}\n`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(
      `  preview-JPEG extraction skipped for ${path.basename(dngPath)}: ${msg.split('\n')[0]}\n`,
    );
  }
};

const scanFixtures = (root: string, cli: string): ParsedFixture[] => {
  const out: ParsedFixture[] = [];
  const skipped: string[] = [];
  // First pass: extract JPEG siblings for any DNGs that don't have
  // one yet. Doing this before the ParsedFixture walk means the
  // second pass sees the freshly-extracted .jpg files as normal
  // fixtures.
  const walkExtract = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walkExtract(full);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith('.dng')) {
        ensureDngJpegSibling(full, cli);
      }
    }
  };
  walkExtract(root);
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && isSupportedFixture(entry.name)) {
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

// Compute per-column and per-row mean brightness across INLIER
// matched-grid points. Illumination-gradient diagnostic: a light
// falling off from left→right shows as low col_means[0] and high
// col_means[last]; a top→bottom fall-off shows in row_means.
// Returns null when we don't have both matchedGridInliers and
// matchedGridBrightness (i.e. RANSAC didn't lock).
type IlluminationStats = {
  column_means: (number | null)[];
  row_means: (number | null)[];
  column_range: number;
  row_range: number;
  unevenness: number; // max(column_range, row_range)
  n_inliers: number;
};
const computeIllumination = (
  page: MunsellPage,
  matchedGridBrightness: readonly number[],
  matchedGridInliers: readonly boolean[],
): IlluminationStats | null => {
  const refPoints = pageReferenceGridPoints(page);
  if (
    refPoints.length !== matchedGridBrightness.length ||
    refPoints.length !== matchedGridInliers.length
  ) {
    return null;
  }
  const colSums = new Map<number, {sum: number; n: number}>();
  const rowSums = new Map<number, {sum: number; n: number}>();
  let nInliers = 0;
  for (let i = 0; i < refPoints.length; i++) {
    if (!matchedGridInliers[i]) continue;
    // Template coords: x = physicalCol * 2, y = physicalRow * 3.
    const col = Math.round(refPoints[i].x / 2);
    const row = Math.round(refPoints[i].y / 3);
    const b = matchedGridBrightness[i];
    if (!colSums.has(col)) colSums.set(col, {sum: 0, n: 0});
    colSums.get(col)!.sum += b;
    colSums.get(col)!.n += 1;
    if (!rowSums.has(row)) rowSums.set(row, {sum: 0, n: 0});
    rowSums.get(row)!.sum += b;
    rowSums.get(row)!.n += 1;
    nInliers++;
  }
  if (nInliers === 0) return null;
  const colKeys = [...colSums.keys()].sort((a, b) => a - b);
  const rowKeys = [...rowSums.keys()].sort((a, b) => a - b);
  const maxCol = colKeys[colKeys.length - 1];
  const maxRow = rowKeys[rowKeys.length - 1];
  const column_means: (number | null)[] = [];
  const row_means: (number | null)[] = [];
  for (let c = 0; c <= maxCol; c++) {
    const s = colSums.get(c);
    column_means.push(s ? Math.round((s.sum / s.n) * 10) / 10 : null);
  }
  for (let r = 0; r <= maxRow; r++) {
    const s = rowSums.get(r);
    row_means.push(s ? Math.round((s.sum / s.n) * 10) / 10 : null);
  }
  const cVals = column_means.filter((v): v is number => v !== null);
  const rVals = row_means.filter((v): v is number => v !== null);
  const colRange = cVals.length > 0 ? Math.max(...cVals) - Math.min(...cVals) : 0;
  const rowRange = rVals.length > 0 ? Math.max(...rVals) - Math.min(...rVals) : 0;
  return {
    column_means,
    row_means,
    column_range: Math.round(colRange * 10) / 10,
    row_range: Math.round(rowRange * 10) / 10,
    unevenness: Math.round(Math.max(colRange, rowRange) * 10) / 10,
    n_inliers: nInliers,
  };
};

const buildRegistrationBlock = (
  outcome: MunsellChartOutcome,
  page: MunsellPage,
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
  const illumination =
    g.matchedGridBrightness && g.matchedGridInliers
      ? computeIllumination(page, g.matchedGridBrightness, g.matchedGridInliers)
      : null;
  return {
    mode: g.matchedGrid ? 'auto' : 'auto-no-match',
    match_score: g.matchedScore,
    match_total: g.matchedRefCount,
    inliers,
    inliers_ratio:
      inliers !== null && g.matchedRefCount && g.matchedRefCount > 0
        ? inliers / g.matchedRefCount
        : null,
    misses:
      inliers !== null && g.matchedRefCount !== null
        ? g.matchedRefCount - inliers
        : null,
    n_detected: g.detected.length,
    n_kept: g.nKept,
    reject_counts: g.rejectCounts,
    paper_luma: g.paperLuma,
    avg_luma: Math.round(g.avgLuma * 10) / 10,
    paper_gap:
      g.paperLuma !== null ? Math.abs(g.paperLuma - g.avgLuma) : null,
    // Midpoint the classifier's isPaperCentre uses to decide "paper
    // vs not paper". Kept regions must be on the paper side of this
    // (brighter than midpoint on bright_paper, darker on dark_paper).
    paper_midpoint:
      g.paperLuma !== null
        ? Math.round(((g.paperLuma + g.avgLuma) / 2) * 10) / 10
        : null,
    direction:
      g.brightPaperOnDark === null
        ? 'fallback'
        : g.brightPaperOnDark
          ? 'bright_paper'
          : 'dark_paper',
    cell_size_px: {w: g.cellW, h: g.cellH},
    chart_body_bounds: g.chartBodyBounds,
    // How far the winning affine displaced each ref point from the
    // "chart perfectly fills the guide" position, normalized by the
    // ideal cell spacing. 0.0 = perfect; 1.0 = a whole cell-step
    // off (definite col or row shift error).
    max_h_offset_frac:
      g.maxHOffsetFrac !== null
        ? Math.round(g.maxHOffsetFrac * 100) / 100
        : null,
    max_v_offset_frac:
      g.maxVOffsetFrac !== null
        ? Math.round(g.maxVOffsetFrac * 100) / 100
        : null,
    illumination,
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
  // Multi-mode: 'whibal' / 'postit' / 'greycard' as anchor labels
  // resolve to the corresponding MULTI_CARD_POINTS slot on the
  // fixture. buildMultiRefMeasurement short-circuits when the fixture
  // isn't a multi fixture or the slot isn't in the results.
  const multi = buildMultiRefMeasurement(label, outcome);
  if (multi) {
    return {
      displayNotation: multi.cell.notation,
      measurement: multi,
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

// Build a WB-anchor measurement from one of the three MULTI_CARD_POINTS
// slots. Only valid for fixtures whose reference === 'multi' and where
// the outcome carries multiRefCards. Returns null in all other cases.
const buildMultiRefMeasurement = (
  slotName: string,
  outcome: MunsellChartOutcome,
): CellMeasurement | null => {
  if (outcome.kind !== 'success') return null;
  const cards = outcome.result.multiRefCards;
  if (!cards) return null;
  const slot = cards.find(c => c.name === slotName);
  if (!slot) return null;
  const expected = REF_CARD_EXPECTED[slotName];
  if (!expected) return null;
  return {
    cell: {
      hue: 'REF',
      value: 0,
      chroma: 0,
      notation: `ref_card:${slotName}`,
      expectedLinearRgb: expected,
      rowIdx: -1,
      colIdx: -1,
    },
    rawLinearRgb: slot.linearRgb,
  };
};

const buildCaptureEntry = (
  fixture: ParsedFixture,
  anchorLabel: string,
  anchor: ResolvedAnchor,
  outcome: MunsellChartOutcome,
  page: MunsellPage,
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
    registration: buildRegistrationBlock(outcome, page),
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
  // Multi mode: build a per-slot block for each of the 3 taped
  // cards, each with its OWN expected/measured/ΔE under the current
  // WB anchor. Same shape as the legacy `ref_card` block, one per
  // slot in MULTI_CARD_POINTS order.
  const multiCards = outcome.result.multiRefCards;
  const refCardsBlock = multiCards
    ? multiCards.map(slot => {
        const expected = REF_CARD_EXPECTED[slot.name];
        const measurement = expected
          ? computeArbitraryResult(
              expected,
              slot.linearRgb,
              anchor.measurement,
              false,
            )
          : null;
        return {
          name: slot.name,
          display_name: REF_CARD_DISPLAY_NAMES[slot.name] ?? slot.name,
          sample_rect: slot.rect,
          raw_linear_rgb: [
            slot.linearRgb.r,
            slot.linearRgb.g,
            slot.linearRgb.b,
          ],
          expected_linear_rgb: expected
            ? [expected.r, expected.g, expected.b]
            : null,
          measured_linear_rgb: measurement
            ? [
                measurement.measuredLinearRgb.r,
                measurement.measuredLinearRgb.g,
                measurement.measuredLinearRgb.b,
              ]
            : null,
          delta_e: measurement ? measurement.deltaE : null,
        };
      })
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
    ref_cards: refCardsBlock,
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
    pages: {type: 'string'},
    'no-html': {type: 'boolean'},
  },
});

const fixturesDir = values.fixtures;
const outPath = values.out;
const emitHtml = !values['no-html'];
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
const allFixtures = scanFixtures(fixturesDir!, DNG_CLI);
const pageFilter = values.pages
  ? new Set(
      values.pages
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean),
    )
  : null;
const fixtures = pageFilter
  ? allFixtures.filter(f => pageFilter.has(f.page.toLowerCase()))
  : allFixtures;
process.stderr.write(
  `found ${allFixtures.length} fixture(s)` +
    (pageFilter
      ? ` — filtered to ${fixtures.length} for pages=[${[...pageFilter].join(', ')}]`
      : '') +
    `; refs=[${refNotations.join(', ')}]\n`,
);

// Two decoders — Android fixtures route their DNG methods through
// the C++ CLI (byte-for-byte match with the on-device Android
// decoder); iOS + unknown-platform fixtures use the Swift CLI
// (CIRAWFilter, matches the on-device iOS decoder). Photo methods
// go through the Swift CLI regardless — JPEG decode is universal.
const iosDecoder = new NodeDecoder(DNG_CLI);
const androidDecoder = fs.existsSync(DNG_CLI_CPP)
  ? new NodeDecoder(DNG_CLI_CPP, DNG_CLI)
  : null;
if (!androidDecoder) {
  process.stderr.write(
    `note: dng-cli-cpp not built at ${DNG_CLI_CPP} — Android DNGs will ` +
      `fall back to the Swift CLI (CIRAWFilter). Run ` +
      `\`npm run build:dng-cli-cpp\` for byte-accurate on-device parity.\n`,
  );
}
const decoderFor = (f: ParsedFixture) =>
  f.platform === 'android' && androidDecoder ? androidDecoder : iosDecoder;
const captures: CaptureJsonEntry[] = [];
const captureContexts: CaptureContext[] = [];
let nSuccess = 0;
let nFailure = 0;

(async () => {
  for (const fixture of fixtures) {
    const page = findMunsellPage(fixture.page);
    const decoder = decoderFor(fixture);
    const t0 = Date.now();
    let outcome: MunsellChartOutcome;
    try {
      outcome = await analyzeMunsellChart(
        decoder,
        fixture.path,
        page,
        fixture.format,
        undefined,
        fixture.reference === 'multi',
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
            matchedGridBrightness: null,
            avgLuma: 0,
            paperLuma: null,
            brightPaperOnDark: null,
            nKept: 0,
            rejectCounts: {
              area_low: 0,
              area_high: 0,
              touches_edge: 0,
              outside_guide: 0,
            },
            maxHOffsetFrac: null,
            maxVOffsetFrac: null,
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
    // torpedo the whole run. Skipped entirely under --no-html since
    // JPEG encoding is the biggest per-fixture cost we can drop when
    // the caller only wants the JSON.
    let previewImage: CaptureContext['previewImage'] | undefined;
    if (outcome.kind === 'success' && emitHtml) {
      try {
        const rendered = decoder.renderPreviewImage(
          fixture.path,
          REPORT_PREVIEW_MAX_DIM,
          fixture.format,
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

    // Multi fixtures replace REF_CARD in the default sweep with the
    // three slot names, so each of whibal/postit/greycard gets its
    // own WB-anchored capture entry alongside the AUTO one. A
    // user-provided --refs list is used verbatim.
    const perFixtureRefs = fixture.reference === 'multi' && !values.refs
      ? [REF_AUTO, 'whibal', 'postit', 'greycard']
      : refNotations;
    for (const refLabel of perFixtureRefs) {
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
        page,
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
      `  ${path.basename(fixture.path)}  ${status} (${ms}ms × ${perFixtureRefs.length} refs)\n`,
    );
  }

  iosDecoder.cleanup();
  androidDecoder?.cleanup();

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

  if (emitHtml) {
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
  } else {
    process.stderr.write(
      `wrote ${captures.length} capture(s) (${nSuccess} success, ${nFailure} failure)\n` +
        `  json:   ${outPath}  (HTML skipped, --no-html)\n`,
    );
  }
})().catch(err => {
  iosDecoder.cleanup();
  androidDecoder?.cleanup();
  die(`fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
});
