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

// Wall-clock timer with per-phase accumulators. Wrap any hot spot
// with .time / .timeAsync and it lands in the end-of-run summary
// (percent of total, count, avg ms). Purely additive — never affects
// analyzer output. Ordered by wall-clock cost in the summary so the
// biggest bucket is always at the top.
class PhaseTimer {
  private totals = new Map<string, number>();
  private counts = new Map<string, number>();
  time<T>(phase: string, fn: () => T): T {
    const t0 = process.hrtime.bigint();
    try {
      return fn();
    } finally {
      const ms = Number(process.hrtime.bigint() - t0) / 1e6;
      this.totals.set(phase, (this.totals.get(phase) ?? 0) + ms);
      this.counts.set(phase, (this.counts.get(phase) ?? 0) + 1);
    }
  }
  async timeAsync<T>(phase: string, fn: () => Promise<T>): Promise<T> {
    const t0 = process.hrtime.bigint();
    try {
      return await fn();
    } finally {
      const ms = Number(process.hrtime.bigint() - t0) / 1e6;
      this.totals.set(phase, (this.totals.get(phase) ?? 0) + ms);
      this.counts.set(phase, (this.counts.get(phase) ?? 0) + 1);
    }
  }
  report(): string {
    const entries = [...this.totals.entries()].sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) return '  (no phases recorded)';
    const total = entries.reduce((s, [, ms]) => s + ms, 0);
    const nameW = Math.max(24, ...entries.map(([n]) => n.length));
    return entries
      .map(([phase, ms]) => {
        const n = this.counts.get(phase) ?? 0;
        const avg = n > 0 ? ms / n : 0;
        const pct = total > 0 ? (ms * 100) / total : 0;
        return (
          `  ${phase.padEnd(nameW)}  ${(ms / 1000).toFixed(1).padStart(7)}s  ` +
          `${pct.toFixed(1).padStart(5)}%  n=${n.toString().padStart(5)}  ` +
          `avg=${avg.toFixed(1).padStart(7)}ms`
        );
      })
      .join('\n');
  }
}
const timer = new PhaseTimer();

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
  type LinearRgbReduced,
  type PreviewImage,
  type PreviewRgb,
  type Roi,
} from 'terraso-mobile-client/screens/MunsellChartValidator/dngDecoderShim';
import {
  MULTI_CARD_OFFSET_PITCHES,
} from 'terraso-mobile-client/screens/MunsellChartValidator/matchAlgorithm';
import {
  findMunsellPage,
  MUNSELL_PAGES,
  pageReferenceGridPoints,
  type MunsellPage,
} from 'terraso-mobile-client/screens/MunsellChartValidator/munsellPages';

import {
  deltaE2000Breakdown,
  renderHtmlReport,
  rgbToLab,
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
  // Plain printer paper taped into the 4th slot below greycard.
  // Placeholder value; refine once we have a per-batch measurement.
  white: {r: 0.85, g: 0.85, b: 0.85},
};

// Expected linear-sRGB for the "paper" pseudo ref — the light-coloured
// background paper the chart sits on for LIGHT BG captures. Placeholder
// until we characterise the actual paper; 0.85 is a reasonable stand-in
// for typical printer paper reflectance.
const PAPER_EXPECTED = {r: 0.85, g: 0.85, b: 0.85};

// True when the fixture was shot on the light-background paper — used
// to gate the 'paper' ref-card synthesis. Detected from folder name so
// dark-background shots (where the whiteMask border ring samples a
// dark surface, not the paper) don't get a misleading paper entry.
const isLightBgPath = (p: string): boolean => p.includes('LIGHT BG');

// Standard sRGB inverse gamma. Input in [0, 1] gamma-encoded space,
// output in [0, 1] linear space. Used to convert whiteMask border
// medians (preview-image gamma-sRGB 0–255) into the same linear-sRGB
// domain the per-cell / per-ref-card raw_linear_rgb values live in.
const srgbGammaInverse = (c: number): number =>
  c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

// Parse exiftool's space-separated numeric strings ("63.92 63.92 63.95 63.95")
// into arrays of numbers; returns [] on empty / non-numeric input.
const parseNumList = (v: unknown): number[] => {
  if (typeof v === 'number') return [v];
  if (typeof v !== 'string') return [];
  return v.split(/\s+/).map(Number).filter(n => !isNaN(n));
};

// Pull the useful diagnostic fields out of an exiftool JSON blob into
// a shape the filmstrip / offline analysis can consume. DNG fixtures
// yield the color-pipeline math (black/white level, AsShotNeutral,
// ColorMatrix1/2, calibration illuminants, bit depth) plus shot
// settings (ISO, exposure, aperture). JPEG fixtures skip the DNG-
// specific tags and just carry shot settings + orientation/WB. Any
// fixture also gets Make/Model/UniqueCameraModel so per-device
// grouping is stable even with per-fixture path variance.
type CaptureImageMetadata = {
  make: string | null;
  model: string | null;
  unique_camera_model: string | null;
  iso: number | null;
  exposure_time: string | null;
  f_number: number | null;
  orientation: string | null;
  white_balance: string | null;
  color_space: string | null;
  // DNG-only tags. Null on JPEG / when the tag isn't stored.
  bits_per_sample: number | null;
  black_level: number[] | null;
  white_level: number | null;
  as_shot_neutral: number[] | null;
  color_matrix_1: number[] | null;
  color_matrix_2: number[] | null;
  calibration_illuminant_1: string | null;
  calibration_illuminant_2: string | null;
  dng_version: string | null;
};
const extractImageMetadata = (raw: any): CaptureImageMetadata => {
  const num = (v: unknown) => (typeof v === 'number' ? v : null);
  const str = (v: unknown) => (typeof v === 'string' ? v : null);
  const list = (v: unknown) => {
    const arr = parseNumList(v);
    return arr.length ? arr : null;
  };
  const wl = list(raw?.WhiteLevel);
  return {
    make: str(raw?.Make),
    model: str(raw?.Model),
    unique_camera_model: str(raw?.UniqueCameraModel),
    iso: num(raw?.ISO),
    exposure_time: str(raw?.ExposureTime) ?? (typeof raw?.ExposureTime === 'number' ? String(raw.ExposureTime) : null),
    f_number: num(raw?.FNumber),
    orientation: str(raw?.Orientation),
    white_balance: str(raw?.WhiteBalance),
    color_space: str(raw?.ColorSpace),
    bits_per_sample: num(raw?.BitsPerSample) ?? (list(raw?.BitsPerSample)?.[0] ?? null),
    black_level: list(raw?.BlackLevel),
    // WhiteLevel is usually a scalar but can be a per-channel list; keep
    // as scalar when uniform, else store the first element.
    white_level: wl ? wl[0] : null,
    as_shot_neutral: list(raw?.AsShotNeutral),
    color_matrix_1: list(raw?.ColorMatrix1),
    color_matrix_2: list(raw?.ColorMatrix2),
    calibration_illuminant_1: str(raw?.CalibrationIlluminant1),
    calibration_illuminant_2: str(raw?.CalibrationIlluminant2),
    dng_version: str(raw?.DNGVersion),
  };
};

// Batch-read metadata for every fixture in one exiftool invocation.
// One shell-out for the whole run instead of one per capture (~500 ×
// 150 ms saved). Returns a source_path → metadata map; missing entries
// silently drop through as nulls in the emitted JSON.
const prefetchImageMetadata = (paths: string[]): Map<string, CaptureImageMetadata> => {
  const map = new Map<string, CaptureImageMetadata>();
  if (paths.length === 0) return map;
  const TAGS = [
    '-Make', '-Model', '-UniqueCameraModel',
    '-ISO', '-ExposureTime', '-FNumber', '-Orientation',
    '-WhiteBalance', '-ColorSpace',
    '-BitsPerSample', '-BlackLevel', '-WhiteLevel', '-AsShotNeutral',
    '-ColorMatrix1', '-ColorMatrix2',
    '-CalibrationIlluminant1', '-CalibrationIlluminant2', '-DNGVersion',
  ];
  try {
    const out = execFileSync(
      'exiftool',
      ['-j', ...TAGS, ...paths],
      {encoding: 'utf-8', maxBuffer: 128 * 1024 * 1024},
    );
    const arr = JSON.parse(out);
    if (Array.isArray(arr)) {
      for (const entry of arr) {
        if (entry?.SourceFile) {
          map.set(entry.SourceFile, extractImageMetadata(entry));
        }
      }
    }
  } catch (e) {
    process.stderr.write(
      `warning: exiftool prefetch failed (${(e as Error).message}); ` +
        `per-capture metadata will be null\n`,
    );
  }
  return map;
};

// Human-facing labels — condensed versions of LINEAR_REFERENCE_NAMES
// in src/model/color/getColorFromLinearRgb.ts. Parenthetical
// qualifiers dropped so they fit in a REF cell without wrapping to
// three lines.
const REF_CARD_DISPLAY_NAMES: Record<string, string> = {
  greycard: '18% Neutral Gray Card',
  whibal: 'WhiBal G7',
  postit: '3M Post-it Yellow',
  white: 'White Printer Paper',
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

// Shared JSON parser for the CLI's decode-dng-rois output shape —
// `[{r,g,b,dominantR,dominantG,dominantB}, ...]`. Both the flat and
// batch endpoints emit inner arrays of this shape.
const parseReducedJson = (json: string): LinearRgbReduced[] => {
  const raw = JSON.parse(json) as Array<{
    r: number;
    g: number;
    b: number;
    dominantR: number;
    dominantG: number;
    dominantB: number;
  }>;
  return raw.map(r => ({
    mean: {r: r.r, g: r.g, b: r.b},
    dominant: {r: r.dominantR, g: r.dominantG, b: r.dominantB},
  }));
};

// Analyzer-local extension of LinearRgbReduced with per-channel
// linear-sRGB variance across the ROI's pixels. Only produced by the
// C++ CLI's decode-dng-rois-batch endpoint (mac-only); the on-device
// Nitro decoders don't expose it, and neither does the Swift dng-cli
// batch fallback (photos + iOS DNGs). Sweep scoring uses it to
// prefer sample positions where each ref-card slot lands on a
// uniform patch (low variance ↔ likely on the card, not straddling
// the strip edge).
type LinearRgbReducedWithVar = LinearRgbReduced & {
  variance: LinearRgb | null;
  // Pre-clamp per-channel mean from the DNG C++ pipeline (see
  // DngPipeline RoiReduced::meanUnclamped). Only populated by the
  // C++ CLI batch endpoint; the Swift path (iOS DNGs, all JPEG
  // fixtures) returns null so downstream callers can fall back to
  // the clamped mean when this isn't available.
  meanUnclamped: LinearRgb | null;
};

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
  // dng-cli-cpp supports `decode-dng-rois-batch`, the Swift dng-cli
  // does not. Set true when constructing an androidDecoder so the
  // sweep can collapse its N-candidate probe into one process
  // invocation. Falls back to a per-candidate loop when false so
  // callers can always use decodeDngRoisReducedBatch and get the best
  // speed available for their CLI.
  private supportsBatch: boolean;

  constructor(
    dngCliPath: string,
    photoCliPath: string = dngCliPath,
    supportsBatch: boolean = false,
  ) {
    this.dngCliPath = dngCliPath;
    this.photoCliPath = photoCliPath;
    this.supportsBatch = supportsBatch;
    this.tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dng-cli-'));
  }

  cleanup(): void {
    fs.rmSync(this.tmpDir, {recursive: true, force: true});
  }

  decodeDngRois(dngPath: string, rois: Roi[]): LinearRgb[] {
    // Both CLIs now always emit `{r,g,b,dominantR,dominantG,dominantB}`
    // per ROI; the extra dominant fields are harmless here since the
    // LinearRgb shape only reads r/g/b — but decodeDngRoisReduced below
    // is the way to actually consume the dominant reducer.
    const out = execFileSync(
      this.dngCliPath,
      ['decode-dng-rois', dngPath, JSON.stringify(rois)],
      {encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024},
    );
    return JSON.parse(out);
  }

  decodeDngRoisReduced(dngPath: string, rois: Roi[]): LinearRgbReduced[] {
    // On dng-cli-cpp we route through the batch endpoint even for a
    // single set — it's the only channel that emits meanUnclamped,
    // and the extra JSON wrap is negligible next to the DNG parse
    // that dominates. iOS Swift CLI stays on the legacy endpoint
    // (it doesn't have a batch subcommand, and its CIRAWFilter path
    // can't give us pre-clamp values anyway).
    if (this.supportsBatch) {
      const batch = this.decodeDngRoisReducedBatch(dngPath, [rois]);
      return batch[0] ?? [];
    }
    const out = execFileSync(
      this.dngCliPath,
      ['decode-dng-rois', dngPath, JSON.stringify(rois)],
      {encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024},
    );
    return parseReducedJson(out);
  }

  // Batch-decode many ROI sets in one CLI invocation when the CLI
  // supports it — the multi-card sweep's raison-d'être. Measured
  // ~6.4× faster than the equivalent N sequential decodeDngRoisReduced
  // calls on Pixel-7 DNGs (parseDng ~20ms vs per-ROI ~0.5ms). Falls
  // back to sequential decodeDngRoisReduced calls when the CLI is
  // Swift-side (iOS DNGs) so callers always get the best-available
  // speed without branching.
  decodeDngRoisReducedBatch(
    dngPath: string,
    roiSets: Roi[][],
  ): LinearRgbReducedWithVar[][] {
    if (!this.supportsBatch) {
      // Swift-CLI fallback path (iOS DNGs). No variance or unclamped
      // mean available — scoring code branches on variance !== null
      // to pick the appropriate objective; WB-scale code falls back
      // to the clamped mean when meanUnclamped is null.
      return roiSets.map(rois =>
        this.decodeDngRoisReduced(dngPath, rois).map(r => ({
          ...r,
          variance: null,
          meanUnclamped: null,
        })),
      );
    }
    if (roiSets.length === 0) return [];
    const out = execFileSync(
      this.dngCliPath,
      ['decode-dng-rois-batch', dngPath, JSON.stringify(roiSets)],
      {encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024},
    );
    const raw = JSON.parse(out) as Array<
      Array<{
        r: number;
        g: number;
        b: number;
        meanUnclampedR?: number;
        meanUnclampedG?: number;
        meanUnclampedB?: number;
        dominantR: number;
        dominantG: number;
        dominantB: number;
        varianceR?: number;
        varianceG?: number;
        varianceB?: number;
      }>
    >;
    return raw.map(inner =>
      inner.map(r => ({
        mean: {r: r.r, g: r.g, b: r.b},
        meanUnclamped:
          r.meanUnclampedR !== undefined &&
          r.meanUnclampedG !== undefined &&
          r.meanUnclampedB !== undefined
            ? {r: r.meanUnclampedR, g: r.meanUnclampedG, b: r.meanUnclampedB}
            : null,
        dominant: {r: r.dominantR, g: r.dominantG, b: r.dominantB},
        variance:
          r.varianceR !== undefined &&
          r.varianceG !== undefined &&
          r.varianceB !== undefined
            ? {r: r.varianceR, g: r.varianceG, b: r.varianceB}
            : null,
      })),
    );
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

// Burst averaging is done POST-analysis on the finished capture
// entries (see buildBurstAverageCaptures below), not by wrapping the
// decoder. An earlier attempt at raw-pixel averaging with a shared
// AveragingDecoder was abandoned because it samples fixed sensor
// coords across all N frames, so any chart movement between frames
// causes it to mix pixels from different physical chips. Averaging
// per-cell values from each frame's OWN chart detection is
// alignment-invariant — the phone can drift a few pixels and the
// answer stays correct.

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
  'white',
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

// New enriched-session tokens produced by the MULTI session flow.
// See docs/munsell-multishot.md "Enriched filenames". These are
// filename-native (no dependency on directory hierarchy):
//   - `ref<name>`  → reference-card layout (refmulti / refgreycard etc.)
//   - `light<slug>`→ user-supplied illuminant type (lightsun / lightshade)
//   - `pixel<n...>`, `iphone<...>` → device model slug
//   - `iso<n>`, `shut<n>{us,ms,s}` → actual sensor params
//   - `burst<i>of<N>`  → burst frame position (already existed)
//   - `awblock`, `aeoff`, `manual`, `auto` → capture-mode flags
const REF_PREFIX = 'ref';
const LIGHT_PREFIX = 'light';
const SESSION_SEQ_RE = /^\d{1,3}$/; // leading numeric seq in enriched names
// Device slugs seen in real filenames. We keep this loose (accept
// anything starting with the recognised prefix) rather than enumerate
// every model — new devices arrive faster than we care to hardcode.
const DEVICE_SLUG_PREFIXES = ['pixel', 'iphone', 'samsung', 'oneplus'];
// Tokens we simply drop from the free-form tags list because they
// don't add analysis value (already captured elsewhere or descriptive
// of a mode we don't track as a filter).
const DROP_TOKENS = new Set([
  'auto', 'manual', 'awblock', 'aeoff', 'aeon',
]);

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
  // First numeric-only token is the enriched-format session sequence
  // (01, 02, ...). Drop it so it doesn't clutter the tag list but
  // keep it out of the "unrecognised" pile.
  let seenSeq = false;

  for (const t of tokens) {
    if (t === ext) continue; // drop redundant `_DNG` (matches extension)
    if (!seenSeq && SESSION_SEQ_RE.test(t)) {
      seenSeq = true;
      continue;
    }
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
    // Enriched-session ref token: `ref<name>` (e.g. `refmulti`,
    // `refgreycard`). Takes precedence over the plain token above
    // since it's the explicitly-typed variant.
    if (t.startsWith(REF_PREFIX) && t.length > REF_PREFIX.length) {
      const name = t.slice(REF_PREFIX.length);
      if (REFERENCE_TOKENS.has(name) || name === 'white') {
        reference = name === 'none' ? 'nothing' : name;
        continue;
      }
    }
    if (ILLUMINANT_TOKENS.has(t)) {
      illuminant_tag = t;
      continue;
    }
    // Enriched-session illuminant slug: `light<name>` (e.g. `lightsun`,
    // `lightshade`, `lightled5000k`). Kept as a free-form tag rather
    // than shoehorned into the existing 'light'/'dark' background
    // slot — it's a different dimension.
    if (t.startsWith(LIGHT_PREFIX) && t.length > LIGHT_PREFIX.length) {
      tags.push(t);
      continue;
    }
    // Device slug — bake into platform + drop from tags.
    if (
      DEVICE_SLUG_PREFIXES.some(pfx => t.startsWith(pfx)) &&
      /\d/.test(t)
    ) {
      // Everything except iphone maps to android.
      platform = t.startsWith('iphone') ? 'ios' : 'android';
      tags.push(t); // keep the specific slug so device filters can
                    // distinguish pixel6a vs pixel4 vs pixel7 etc.
      continue;
    }
    if (PLATFORM_TOKENS.has(t as 'ios' | 'android')) {
      platform = t as 'ios' | 'android';
      continue;
    }
    if (t === BOTH_TOKEN) continue;
    if (TIMESTAMP_RE.test(t)) continue;
    if (DROP_TOKENS.has(t)) continue;
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

// Matches the `_burstNofM` filename token emitted by the on-device
// burst capture (see modules/raw-camera-android/…/CameraSessionManager.kt
// buildFileStem). Case-insensitive because parseFixtureFilename lowercases
// all tokens before regex matches.
const BURST_TAG_RE = /^burst(\d+)of(\d+)$/;

const scanFixtures = (
  root: string,
  cli: string,
  // Optional predicate — when set, files whose full path fails the
  // check are skipped for BOTH the JPEG-sibling extraction pass and
  // the fixture-parse pass. Used to make --filter runs cheap:
  // otherwise we'd extract a preview JPEG from every DNG in the
  // whole tree before filtering the resulting fixture list.
  keepPath: (fullPath: string) => boolean = () => true,
): ParsedFixture[] => {
  const out: ParsedFixture[] = [];
  const skipped: string[] = [];
  // Resolve a directory entry's real type, tolerating broken
  // symlinks (dangling targets throw ENOENT from statSync — a
  // stray symlink in a scanned tree shouldn't kill the whole run).
  // Returns null when the entry should be skipped entirely.
  const resolveEntry = (
    entry: fs.Dirent,
    full: string,
  ): {isDirectory(): boolean; isFile(): boolean} | null => {
    if (!entry.isSymbolicLink()) return entry;
    try {
      return fs.statSync(full);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      process.stderr.write(
        `  scan: skipping broken symlink ${full}: ${msg.split('\n')[0]}\n`,
      );
      return null;
    }
  };
  // First pass: extract JPEG siblings for any DNGs that don't have
  // one yet. Doing this before the ParsedFixture walk means the
  // second pass sees the freshly-extracted .jpg files as normal
  // fixtures.
  const walkExtract = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      const st = resolveEntry(entry, full);
      if (!st) continue;
      if (st.isDirectory()) walkExtract(full);
      else if (
        st.isFile() &&
        entry.name.toLowerCase().endsWith('.dng') &&
        keepPath(full)
      ) {
        ensureDngJpegSibling(full, cli);
      }
    }
  };
  walkExtract(root);
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
      if (entry.name.startsWith('.')) continue;
      const full = path.join(dir, entry.name);
      const st = resolveEntry(entry, full);
      if (!st) continue;
      if (st.isDirectory()) {
        walk(full);
      } else if (st.isFile() && isSupportedFixture(entry.name)) {
        if (!keepPath(full)) continue;
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
  // Paper: synthetic ref derived from the whitemask border-ring
  // median. Only valid on LIGHT BG shots (the ring is actually paper
  // there). Falls through to null when unavailable so the sweep
  // silently skips it on dark-bg fixtures.
  if (label === 'paper') {
    const paper = buildPaperMeasurement(fixture, outcome);
    if (!paper) return null;
    return {
      displayNotation: paper.cell.notation,
      measurement: paper,
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
  // Multi lookup failed for a known slot name — likely the multi
  // slot wasn't detected on this specific capture (e.g. bad
  // registration in that corner). Emit the normalized "ref_card:{slot}"
  // notation anyway so downstream (delta-e-analysis, munsell-error
  // filmstrip) doesn't fall back to the physical reference_card and
  // display "multi" as a fake WB anchor.
  if (
    label === 'whibal' ||
    label === 'postit' ||
    label === 'greycard' ||
    label === 'white'
  ) {
    return {
      displayNotation: `ref_card:${label}`,
      measurement: undefined,
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
    // Pre-clamp mean when the sweep found one — WB scale divides
    // by this to avoid under-correcting on bright anchors. Null
    // when the underlying decoder path (JPEG / iOS DNG Swift) can't
    // produce it; cellResults falls back to rawLinearRgb.
    rawLinearRgbUnclamped: slot.linearRgbUnclamped,
  };
};

// Build a WB-anchor measurement from the whitemask border ring's
// paper reading. Only valid for LIGHT BG shots (border ring is
// actually paper); dark-bg shots would anchor to the tabletop.
// Reads grid.paperMedianR/G/B (preview-image gamma-sRGB 0-255) and
// inverse-gammas to the linear-sRGB domain the analyzer's other WB
// anchors live in. Returns null when either condition fails.
const buildPaperMeasurement = (
  fixture: ParsedFixture,
  outcome: MunsellChartOutcome,
): CellMeasurement | null => {
  if (outcome.kind !== 'success') return null;
  if (!isLightBgPath(fixture.path)) return null;
  const g = outcome.result.grid;
  const r = g?.paperMedianR;
  const gg = g?.paperMedianG;
  const b = g?.paperMedianB;
  if (r == null || gg == null || b == null) return null;
  return {
    cell: {
      hue: 'REF',
      value: 0,
      chroma: 0,
      notation: 'ref_card:paper',
      expectedLinearRgb: PAPER_EXPECTED,
      rowIdx: -1,
      colIdx: -1,
    },
    rawLinearRgb: {
      r: srgbGammaInverse(r / 255),
      g: srgbGammaInverse(gg / 255),
      b: srgbGammaInverse(b / 255),
    },
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
    image_metadata: imageMetadataByPath.get(fixture.path) ?? null,
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
  // Synthesise a 'paper' ref card from the whiteMask border-ring
  // median, but only for LIGHT BG shots — the ring on a dark table
  // isn't the paper we claim it is. Values are in preview-image
  // gamma-sRGB (0–255); convert to linear-sRGB via inverse gamma so
  // it lives in the same domain as the other ref cards' raw values.
  const grid = outcome.result.grid;
  const paperRefEntry = (() => {
    if (!isLightBgPath(fixture.path)) return null;
    const r = grid?.paperMedianR;
    const g = grid?.paperMedianG;
    const b = grid?.paperMedianB;
    if (r == null || g == null || b == null) return null;
    return {
      name: 'paper',
      display_name: 'Background paper',
      sample_rect: null,
      raw_linear_rgb: [
        srgbGammaInverse(r / 255),
        srgbGammaInverse(g / 255),
        srgbGammaInverse(b / 255),
      ],
      // No dominant reducer for the paper pseudo-ref — it's synthesised
      // from the whiteMask border-ring median, not sampled via a
      // decoder ROI.
      raw_linear_rgb_dominant: null,
      expected_linear_rgb: [PAPER_EXPECTED.r, PAPER_EXPECTED.g, PAPER_EXPECTED.b],
      measured_linear_rgb: null,
      delta_e: null,
    };
  })();

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
              slot.linearRgbUnclamped,
            )
          : null;
        return {
          name: slot.name,
          display_name: REF_CARD_DISPLAY_NAMES[slot.name] ?? slot.name,
          sample_rect: slot.rect,
          // Union of every rect the multi-card sweep considered for
          // this slot. run.html renders it as an overlay so a
          // reviewer can spot "sweep range didn't reach the card"
          // at a glance. Null when the sweep didn't run for this
          // fixture (e.g. single-card mode).
          search_rect: slot.searchArea,
          raw_linear_rgb: [
            slot.linearRgb.r,
            slot.linearRgb.g,
            slot.linearRgb.b,
          ],
          // Pre-clamp mean when the decoder exposes it (RAW / dng-cli-cpp
          // path); null on JPEG + iOS-DNG Swift path. Consumers doing
          // WB math should prefer this over raw_linear_rgb — see
          // CellMeasurement.rawLinearRgbUnclamped.
          raw_linear_rgb_unclamped: slot.linearRgbUnclamped
            ? [
                slot.linearRgbUnclamped.r,
                slot.linearRgbUnclamped.g,
                slot.linearRgbUnclamped.b,
              ]
            : null,
          raw_linear_rgb_dominant: slot.linearRgbDominant
            ? [
                slot.linearRgbDominant.r,
                slot.linearRgbDominant.g,
                slot.linearRgbDominant.b,
              ]
            : null,
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
  // Append the paper pseudo-ref to whichever base list was built —
  // either the multi-card block or (when the shot wasn't multi-mode)
  // a fresh list. Filmstrip client-side picks any name up automatically.
  const refCardsWithPaper = paperRefEntry
    ? [...(refCardsBlock ?? []), paperRefEntry]
    : refCardsBlock;
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
            raw_linear_rgb_dominant: outcome.result.testSwatchLinearRgbDominant
              ? [
                  outcome.result.testSwatchLinearRgbDominant.r,
                  outcome.result.testSwatchLinearRgbDominant.g,
                  outcome.result.testSwatchLinearRgbDominant.b,
                ]
              : null,
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
    ref_cards: refCardsWithPaper,
    // Diagnostic: per-slot (H, V) picked by the multi-card sweep.
    // Each entry is {name, h, v, score} where h is in colPitch
    // units past the last chip column (nominal 1.75), v is in
    // ref-grid units downward from row centroid (nominal 0), and
    // score is that slot's linear-sRGB variance sum at the picked
    // position (lower = more uniform patch). h/v/score are null
    // when the slot had no candidate passing the brightness /
    // saturation gates (rect fell back to the analyzer's chart-
    // derived seed position). Null on the whole field when the
    // fixture is single-card mode or sweep didn't run.
    multi_card_sweep_per_slot:
      (outcome as any)._sweepPerSlot ?? null,
    cells: results.map((r, i) => {
      const dom = measurements[i].rawLinearRgbDominant;
      const unc = measurements[i].rawLinearRgbUnclamped;
      return {
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
        // Pre-clamp mean when the decoder exposes it (RAW / dng-cli-cpp
        // path); null on JPEG + iOS-DNG Swift path. WB scale in
        // cellResults divides by this when present — see
        // CellMeasurement.rawLinearRgbUnclamped.
        raw_linear_rgb_unclamped: unc ? [unc.r, unc.g, unc.b] : null,
        // Median-cut dominant reducer companion. Same units + coord
        // frame as raw_linear_rgb; null on photo-path fixtures (see
        // CellMeasurement.rawLinearRgbDominant note in cellResults.ts).
        // Filmstrip's mean/dominant radio flips downstream ΔE math to
        // use this in place of raw_linear_rgb.
        raw_linear_rgb_dominant: dom ? [dom.r, dom.g, dom.b] : null,
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
      };
    }),
  };
};

// ---- Burst averaging (docs/munsell-dark-sensor.md option #3) --------------

// Compute per-cell / per-refcard averaged raw values across a group
// of burst frames, then rebuild the measured + ΔE downstream. Uses
// each frame's OWN chart detection (baked into the per-frame
// raw_linear_rgb), so this is alignment-invariant — the phone can
// drift a few pixels between frames without corrupting the average.
//
// Grouping key: (dir, capture_format, page, platform, reference,
// illuminant, non-burst tags, WB anchor). All frames sharing that
// key are averaged into one synthetic capture.
const buildBurstAverageCaptures = (
  captures: readonly CaptureJsonEntry[],
  contexts: readonly CaptureContext[],
): {captures: CaptureJsonEntry[]; contexts: CaptureContext[]} => {
  type Frame = {cap: CaptureJsonEntry; ctx: CaptureContext; idx: number};
  const groups = new Map<string, Frame[]>();
  const outCaptures: CaptureJsonEntry[] = [];
  const outContexts: CaptureContext[] = [];
  for (let i = 0; i < captures.length; i++) {
    const cap = captures[i];
    const ctx = contexts[i];
    if (!ctx) continue;
    // Skip failed captures (empty cells) — averaging needs data.
    if (!cap.cells || cap.cells.length === 0) continue;
    // Look for a `_burstNofM` token in the tags list. parseFixtureFilename
    // lowercases + puts unrecognised tokens into environment.tags.
    const burstTag = cap.environment.tags.find(t => BURST_TAG_RE.test(t));
    if (!burstTag) continue;
    const m = BURST_TAG_RE.exec(burstTag)!;
    const frameIdx = parseInt(m[1], 10);
    const total = parseInt(m[2], 10);
    if (total < 2) continue;
    const otherTags = cap.environment.tags
      .filter(t => !BURST_TAG_RE.test(t))
      .sort();
    // WB anchor is baked into the second half of capture_id. Same
    // anchor across frames is essential — different anchors would
    // scale the raws differently and averaging becomes meaningless.
    const anchorKey = cap.capture_id.split('__', 2)[1] ?? '';
    const key = [
      path.dirname(cap.source_path),
      cap.capture_format,
      cap.page,
      cap.reference_card ?? '',
      cap.environment.illuminant_tag ?? '',
      otherTags.join(','),
      anchorKey,
    ].join('|');
    let bucket = groups.get(key);
    if (!bucket) {
      bucket = [];
      groups.set(key, bucket);
    }
    bucket.push({cap, ctx, idx: frameIdx});
  }
  for (const frames of groups.values()) {
    if (frames.length < 2) continue;
    frames.sort((a, b) => a.idx - b.idx);
    const template = frames[0].cap;
    const templateCtx = frames[0].ctx;
    const n = frames.length;

    // Sanity: all frames must have the same cell layout — same count,
    // same physical positions. If a frame's chart detection dropped
    // cells or reordered them, skip this group to avoid mixing
    // measurements from different chips.
    const cellCount = template.cells.length;
    const layoutMatches = frames.every(
      f =>
        f.cap.cells.length === cellCount &&
        f.cap.cells.every(
          (c, i) =>
            c.physical_row === template.cells[i].physical_row &&
            c.physical_col === template.cells[i].physical_col,
        ),
    );
    if (!layoutMatches) {
      process.stderr.write(
        `burst-avg: skipping group ${path.basename(template.source_path)} ` +
          `(N=${n}): cell layouts differ across frames\n`,
      );
      continue;
    }

    // Average per-cell raw_linear_rgb (and companion dominant) across
    // frames. Dominant is a median-cut reducer: strictly speaking a
    // per-pixel operation, so averaging its per-frame outputs is a
    // pragmatic approximation — it stays "the biggest-cluster centroid
    // per frame, averaged" rather than "the median-cut over the union
    // of all frames' pixels". Good enough for the filmstrip's A/B toy;
    // if the divergence matters, an offline recomputation would need
    // the raw DNGs anyway.
    const avgCells = template.cells.map((tCell, i) => {
      let r = 0, g = 0, b = 0;
      let dR = 0, dG = 0, dB = 0;
      let uR = 0, uG = 0, uB = 0;
      let domFrames = 0;
      let uncFrames = 0;
      for (const f of frames) {
        const c = f.cap.cells[i];
        r += c.raw_linear_rgb[0];
        g += c.raw_linear_rgb[1];
        b += c.raw_linear_rgb[2];
        const cd = c.raw_linear_rgb_dominant;
        if (cd) {
          dR += cd[0];
          dG += cd[1];
          dB += cd[2];
          domFrames += 1;
        }
        const cu = c.raw_linear_rgb_unclamped;
        if (cu) {
          uR += cu[0];
          uG += cu[1];
          uB += cu[2];
          uncFrames += 1;
        }
      }
      return {
        ...tCell,
        raw_linear_rgb: [r / n, g / n, b / n] as [number, number, number],
        raw_linear_rgb_dominant:
          domFrames > 0
            ? ([dR / domFrames, dG / domFrames, dB / domFrames] as [
                number, number, number,
              ])
            : null,
        raw_linear_rgb_unclamped:
          uncFrames > 0
            ? ([uR / uncFrames, uG / uncFrames, uB / uncFrames] as [
                number, number, number,
              ])
            : null,
      };
    });

    // Average per-refcard raw_linear_rgb (+ companion dominant) across
    // frames (multi mode).
    const templateRefCards = template.ref_cards;
    let avgRefCards: typeof templateRefCards = null;
    if (templateRefCards && templateRefCards.length > 0) {
      avgRefCards = templateRefCards.map((tRc, i) => {
        let r = 0, g = 0, b = 0;
        let dR = 0, dG = 0, dB = 0;
        let uR = 0, uG = 0, uB = 0;
        let domFrames = 0;
        let uncFrames = 0;
        for (const f of frames) {
          const rc = f.cap.ref_cards?.[i];
          if (!rc) return tRc; // schema drift; keep template as-is
          r += rc.raw_linear_rgb[0];
          g += rc.raw_linear_rgb[1];
          b += rc.raw_linear_rgb[2];
          const rd = rc.raw_linear_rgb_dominant;
          if (rd) {
            dR += rd[0];
            dG += rd[1];
            dB += rd[2];
            domFrames += 1;
          }
          const ru = rc.raw_linear_rgb_unclamped;
          if (ru) {
            uR += ru[0];
            uG += ru[1];
            uB += ru[2];
            uncFrames += 1;
          }
        }
        return {
          ...tRc,
          raw_linear_rgb: [r / n, g / n, b / n] as [number, number, number],
          raw_linear_rgb_dominant:
            domFrames > 0
              ? ([dR / domFrames, dG / domFrames, dB / domFrames] as [
                  number, number, number,
                ])
              : null,
          raw_linear_rgb_unclamped:
            uncFrames > 0
              ? ([uR / uncFrames, uG / uncFrames, uB / uncFrames] as [
                  number, number, number,
                ])
              : null,
        };
      });
    }

    // Locate the WB anchor's averaged (raw, expected) so we can
    // recompute the per-channel gain. Anchor is either a Munsell
    // notation (find matching cell) or a ref_card:<name> sentinel
    // (find matching card in avgRefCards).
    const wbRef = template.wb_correction?.reference ?? '';
    let anchorRaw: [number, number, number] | null = null;
    let anchorExpected: [number, number, number] | null = null;
    if (wbRef.startsWith('ref_card:')) {
      const cardName = wbRef.slice('ref_card:'.length);
      const rc = avgRefCards?.find(x => x.name === cardName);
      if (rc?.expected_linear_rgb) {
        // Prefer averaged unclamped anchor when available; falls back
        // to clamped average when unclamped isn't in the frames (photo
        // path, iOS-DNG). See wbRgbScaleFromReference for why.
        anchorRaw = rc.raw_linear_rgb_unclamped ?? rc.raw_linear_rgb;
        anchorExpected = rc.expected_linear_rgb;
      }
    } else if (wbRef) {
      const c = avgCells.find(x => x.expected_notation === wbRef);
      if (c) {
        anchorRaw = c.raw_linear_rgb_unclamped ?? c.raw_linear_rgb;
        anchorExpected = c.expected_linear_rgb;
      }
    }
    // Fall through to identity gain if we couldn't find the anchor —
    // measured will equal raw, ΔE will look terrible, but we don't
    // silently pretend the average worked.
    const MIN = 1e-4;
    const gain: [number, number, number] = anchorRaw && anchorExpected
      ? [
          anchorRaw[0] > MIN ? anchorExpected[0] / anchorRaw[0] : 1,
          anchorRaw[1] > MIN ? anchorExpected[1] / anchorRaw[1] : 1,
          anchorRaw[2] > MIN ? anchorExpected[2] / anchorRaw[2] : 1,
        ]
      : [1, 1, 1];

    // Apply gain to each averaged cell raw → measured. Recompute ΔE
    // in Lab (D65) using the same deltaE2000 the report uses so avg
    // and single-frame numbers are directly comparable. Prefer the
    // unclamped average as the raw input — a bright chip whose true
    // R is 1.35 shouldn't get its measured value pinned to
    // (gain × 1.0) instead of (gain × 1.35).
    for (const cell of avgCells) {
      const raw = cell.raw_linear_rgb_unclamped ?? cell.raw_linear_rgb;
      const meas: [number, number, number] = [
        raw[0] * gain[0],
        raw[1] * gain[1],
        raw[2] * gain[2],
      ];
      cell.measured_linear_rgb = meas;
      cell.delta_e = deltaE2000Breakdown(
        rgbToLab(cell.expected_linear_rgb),
        rgbToLab(meas),
      ).total;
      // measured_notation is derived from measured Lab → nearest
      // Munsell notation; recomputing it needs the munsell library.
      // For the averaged view we leave it as the template's value —
      // the raw+measured+ΔE fields are the ones that actually drive
      // downstream analysis.
    }
    if (avgRefCards) {
      for (const rc of avgRefCards) {
        if (!rc.expected_linear_rgb) continue;
        const raw = rc.raw_linear_rgb_unclamped ?? rc.raw_linear_rgb;
        const meas: [number, number, number] = [
          raw[0] * gain[0],
          raw[1] * gain[1],
          raw[2] * gain[2],
        ];
        rc.measured_linear_rgb = meas;
        rc.delta_e = deltaE2000Breakdown(
          rgbToLab(rc.expected_linear_rgb),
          rgbToLab(meas),
        ).total;
      }
    }

    // Rewrite label, source_path, capture_id with a burstavgofN
    // suffix so downstream tools (filmstrip, ranking, etc.) can
    // filter / distinguish it from individual frames.
    const avgTag = `burstavgof${n}`;
    const newLabel = template.label.replace(/_burst\d+of\d+/i, `_${avgTag}`);
    // Replace the burst token in the source_path with the burstavg
    // token. Uses a token-body match (no anchor on the extension) so
    // we cope with the `_burstNofM_auto.dng` naming that session-mode
    // captures produce. Absolute correctness matters here: the
    // filmstrip dedupes samples by (sourcePath × cell × format), so
    // a synthetic burstavg entry that keeps the same source_path as
    // frame 1 gets silently dropped as a duplicate.
    const newSourcePath = template.source_path.replace(
      /_burst\d+of\d+/i,
      `_${avgTag}`,
    );
    const newTags = template.environment.tags
      .filter(t => !BURST_TAG_RE.test(t))
      .concat([avgTag]);
    const newCaptureId = template.capture_id.replace(
      /_burst\d+of\d+/i,
      `_${avgTag}`,
    );
    const avgCapture: CaptureJsonEntry = {
      ...template,
      capture_id: newCaptureId,
      label: newLabel,
      source_path: newSourcePath,
      environment: {...template.environment, tags: newTags},
      cells: avgCells,
      ref_cards: avgRefCards ?? null,
      // Ref_card (single) is stale for the averaged case if present;
      // the fixtures we care about use ref_cards (multi). Recomputing
      // it would require the same anchor logic as avgRefCards but for
      // a single card — skipping until we have a single-ref burst
      // fixture that needs it.
    };
    outCaptures.push(avgCapture);
    outContexts.push({
      ...templateCtx,
      jsonEntry: avgCapture,
    });
  }
  return {captures: outCaptures, contexts: outContexts};
};

// ---- MULTI ref-card horizontal offset sweep --------------------------------

// Candidate horizontal offsets (in colPitch units past the last chip
// column) to test for each MULTI capture. Baseline is the app's
// nominal MULTI_CARD_OFFSET_PITCHES (1.75×). Physical mask + chart
// slop can shift the actual patch positions anywhere from ~1.5 to
// ~2.4 depending on how the chart sits in the holder + how the
// ref-card strip is taped. Range widened after the 322-sweep pass
// on Multi Ref Capture 0824 saw 41% hit the old 1.70 floor and 27%
// hit the old 2.10 ceiling — both ends need more slack. Kept at 0.1
// granularity (~0.06" per step on the physical card) so the wider
// grid is 10 candidates deep. Total sweep cost stays flat vs the
// old 5-candidate range now that decode-dng-rois-batch collapses
// the whole probe into one CLI call per fixture.
const OFFSET_SWEEP: readonly number[] = [
  1.5, 1.6, 1.7, 1.8, 1.9, 2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 3.0,
];

// Candidate vertical shifts, in ref-grid units, applied DOWN from
// the nominal MULTI_CARD_POINTS y (positive = lower on the card as
// rendered in the image). Physical mask cutouts on the ref-card
// strip sit ~3 ref-units tall (row pitch), so the sample rect —
// which is ~0.25 ref-units tall — can shift down by up to ~1.4
// units while staying inside the cutout. Zero is baseline (row
// centroid). Bias is asymmetric-downward because top of each cutout
// is where the strip's shadow lands (top edge of the paper strip
// is elevated by the tape wedge, casting a soft shadow onto the top
// ~⅓ of the cutout). Sweeping symmetrically would let a fixture
// "win" by moving into the shadow — not helpful. Range widened
// again past the previous 1.20 ceiling (still 28% of sweeps pinned
// there on that pass); 1.50 is at the physical edge of "still
// inside the cutout" for a nominal-sized rect.
const VERTICAL_SWEEP: readonly number[] = [
  0.0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1.05, 1.2, 1.35, 1.5,
];

// Debug-only: emit an HTML page with one H×V grid per slot
// (whibal / postit / greycard / white). Each cell shows a crop of
// the actual preview pixels at that candidate's per-slot rect, and
// its background is colour-coded by that slot's own variance sum
// (linear-sRGB, "evenness"). Per-slot coloring — each grid is
// normalised to its own min/max so the heatmap reads as "which
// (H, V) is the best position for THIS card". Per-slot winner
// (bestPerSlot[i]) has a black outline. Cells rejected by the
// brightness or saturation gate are drawn dark grey with the reason
// as a label — useful for spotting when the "clean white" area got
// rejected as clipped.
//
// Showing REAL pixels (not the mean colour) lets a human see the
// mix that produced the mean: a rect fully on the card looks like a
// uniform patch; a straddling rect shows card on one side + dark
// strip on the other. That's the visualisation "evenness" is
// supposed to measure numerically — high variance if you can see
// two materials in the crop.
function writeSweepDebugHtml(
  outPath: string,
  data: {
    fixture: string;
    rows: Array<{
      candidate: number;
      vShift: number;
      samples: Array<{r: number; g: number; b: number}>;
      variances: Array<{r: number; g: number; b: number} | null>;
      // Per-slot preview-space rect for the sample area at this
      // (H, V) candidate. One entry per slot in `slotNames` order.
      rects: Array<{x: number; y: number; w: number; h: number} | null>;
    }>;
    slotNames: string[];
    expectedByName: Record<string, {r: number; g: number; b: number}>;
    // Per-slot winner (null if the slot found no passing candidate
    // and fell back to its seed rect).
    winners: Array<{h: number; v: number; score: number} | null>;
    minSlotBrightness: number;
    maxSlotBrightness: number;
    preview: {pixels: Uint8Array; width: number; height: number} | null;
  },
): void {
  // pngjs is a pure-JS PNG encoder in node_modules — used only in
  // debug mode, not in the analyzer hot path. Encode each ROI crop
  // as a small PNG data URI; CSS then upscales with pixelated
  // rendering so individual sensor pixels stay visible.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const {PNG} = require('pngjs') as typeof import('pngjs');
  const cropPngDataUri = (
    rect: {x: number; y: number; w: number; h: number},
  ): string | null => {
    if (!data.preview) return null;
    const {pixels, width, height} = data.preview;
    // Clamp to preview bounds (rect can spill past edge on some
    // sweep candidates; better to crop the intersect than reject).
    const x0 = Math.max(0, Math.min(width, Math.round(rect.x)));
    const y0 = Math.max(0, Math.min(height, Math.round(rect.y)));
    const x1 = Math.max(x0, Math.min(width, Math.round(rect.x + rect.w)));
    const y1 = Math.max(y0, Math.min(height, Math.round(rect.y + rect.h)));
    const w = x1 - x0;
    const h = y1 - y0;
    if (w <= 0 || h <= 0) return null;
    const png = new PNG({width: w, height: h});
    // pngjs uses RGBA; preview is interleaved RGB — expand to RGBA
    // with alpha=255. Row-by-row copy since preview has no padding
    // but png.data is w*h*4 bytes tight.
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const src = ((y0 + j) * width + (x0 + i)) * 3;
        const dst = (j * w + i) * 4;
        png.data[dst] = pixels[src];
        png.data[dst + 1] = pixels[src + 1];
        png.data[dst + 2] = pixels[src + 2];
        png.data[dst + 3] = 255;
      }
    }
    const buf = PNG.sync.write(png);
    return 'data:image/png;base64,' + buf.toString('base64');
  };
  const linearToSrgb = (v: number) => {
    const c = Math.max(0, Math.min(1, v));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };
  const swatch = (rgb: {r: number; g: number; b: number}, label: string) => {
    const r = Math.round(linearToSrgb(rgb.r) * 255);
    const g = Math.round(linearToSrgb(rgb.g) * 255);
    const b = Math.round(linearToSrgb(rgb.b) * 255);
    return (
      `<div class="sw" style="background:rgb(${r},${g},${b})" ` +
      `title="${label}: linear=(${rgb.r.toFixed(3)},${rgb.g.toFixed(3)},${rgb.b.toFixed(3)})"></div>`
    );
  };
  const uniqueH = [
    ...new Set(data.rows.map(r => r.candidate)),
  ].sort((a, b) => a - b);
  const uniqueV = [...new Set(data.rows.map(r => r.vShift))].sort(
    (a, b) => a - b,
  );
  const rowByKey = new Map(
    data.rows.map(r => [`${r.candidate}|${r.vShift}`, r]),
  );
  // Reject reason per (row, slot) — mirrors the sweep's gate order:
  //   'sat' → any mean channel above MAX_SLOT_BRIGHTNESS (clipped)
  //   'dark' → all-channel mean below MIN_SLOT_BRIGHTNESS (on strip)
  //   null → passed both gates and was scored on variance
  const rejectReason = (
    mean: {r: number; g: number; b: number} | null,
  ): 'sat' | 'dark' | null => {
    if (!mean) return null;
    const maxChan = Math.max(mean.r, mean.g, mean.b);
    if (maxChan > data.maxSlotBrightness) return 'sat';
    const brightness = (mean.r + mean.g + mean.b) / 3;
    if (brightness < data.minSlotBrightness) return 'dark';
    return null;
  };
  const slotSectionHtml = (slotIdx: number): string => {
    const name = data.slotNames[slotIdx];
    const winner = data.winners[slotIdx];
    // Collect per-slot variance scores + reject reasons in one pass
    // so both the heatmap normalisation and the cell render can use
    // them without repeating the gate logic.
    const cellData: Array<{
      candidate: number;
      vShift: number;
      score: number | null;
      reject: 'sat' | 'dark' | null;
      mean: {r: number; g: number; b: number} | null;
      variance: {r: number; g: number; b: number} | null;
      rect: {x: number; y: number; w: number; h: number} | null;
    }> = data.rows.map(r => {
      const mean = r.samples[slotIdx] ?? null;
      const variance = r.variances[slotIdx] ?? null;
      const rect = r.rects[slotIdx] ?? null;
      const reject = rejectReason(mean);
      const score =
        !reject && variance ? variance.r + variance.g + variance.b : null;
      return {
        candidate: r.candidate,
        vShift: r.vShift,
        score,
        reject,
        mean,
        variance,
        rect,
      };
    });
    const byKey = new Map(cellData.map(c => [`${c.candidate}|${c.vShift}`, c]));
    const passingScores = cellData
      .map(c => c.score)
      .filter((s): s is number => s !== null && Number.isFinite(s));
    const minS = passingScores.length > 0 ? Math.min(...passingScores) : 0;
    const maxS = passingScores.length > 0 ? Math.max(...passingScores) : 1;
    const scoreColour = (s: number) => {
      const t = maxS > minS ? (s - minS) / (maxS - minS) : 0;
      const hue = 120 - 120 * t; // green (120) → red (0)
      return `hsl(${hue.toFixed(0)}, 65%, 82%)`;
    };
    let out = `<h2>${name}</h2>`;
    const winnerLine = winner
      ? `winner H=${winner.h.toFixed(2)} V=${winner.v.toFixed(2)} ` +
        `variance-sum=${winner.score.toExponential(3)}`
      : `no candidate passed the brightness/saturation gates — ` +
        `slot kept its chart-derived seed rect`;
    out += `<p class="hdr">${winnerLine}. `;
    if (data.expectedByName[name]) {
      const e = data.expectedByName[name];
      out +=
        `Expected: ${swatch(e, `expected ${name}`)} ` +
        `linear=(${e.r.toFixed(2)},${e.g.toFixed(2)},${e.b.toFixed(2)}). `;
    }
    out += `Heatmap is normalised to this slot's own passing range.</p>`;
    out += '<table><thead><tr><th>H \\ V</th>';
    for (const v of uniqueV) out += `<th>V=${v.toFixed(2)}</th>`;
    out += '</tr></thead><tbody>';
    for (const h of uniqueH) {
      out += `<tr><th>H=${h.toFixed(2)}</th>`;
      for (const v of uniqueV) {
        const c = byKey.get(`${h}|${v}`);
        if (!c) {
          out += '<td class="miss">–</td>';
          continue;
        }
        const isWinner =
          winner && h === winner.h && v === winner.v;
        const bg =
          c.reject === 'sat'
            ? '#c8b0d8'
            : c.reject === 'dark'
              ? '#444'
              : c.score !== null
                ? scoreColour(c.score)
                : '#555';
        const dataUri = c.rect ? cropPngDataUri(c.rect) : null;
        const title = [
          `H=${h.toFixed(2)} V=${v.toFixed(2)}`,
          c.mean
            ? `mean=(${c.mean.r.toFixed(3)},${c.mean.g.toFixed(3)},${c.mean.b.toFixed(3)})`
            : '',
          c.variance
            ? `variance=(${c.variance.r.toExponential(2)},${c.variance.g.toExponential(2)},${c.variance.b.toExponential(2)})`
            : '',
          c.reject === 'sat' ? 'REJECT saturation (mean channel > gate)' : '',
          c.reject === 'dark' ? 'REJECT brightness (mean < gate)' : '',
        ]
          .filter(Boolean)
          .join(' · ');
        const scoreLabel =
          c.reject === 'sat'
            ? 'sat'
            : c.reject === 'dark'
              ? 'dark'
              : c.score !== null
                ? c.score.toExponential(2)
                : '–';
        const textColor = c.reject === 'dark' ? '#eee' : '#000';
        out +=
          `<td style="background:${bg};color:${textColor}` +
          `${isWinner ? ';outline:3px solid #000;outline-offset:-2px' : ''}" ` +
          `title="${title}">` +
          `<div class="cell-inner">` +
          (dataUri
            ? `<img src="${dataUri}" alt="" class="crop">`
            : '<div class="crop miss"></div>') +
          `<span class="s">${scoreLabel}</span>` +
          '</div>' +
          '</td>';
      }
      out += '</tr>';
    }
    out += '</tbody></table>';
    return out;
  };
  let body = `<h1>Sweep debug — ${data.fixture}</h1>`;
  body +=
    `<p>Per-slot sweep grid. Score = intra-ROI linear-sRGB variance ` +
    `summed across channels (the "evenness" metric — lower = more ` +
    `uniform patch). Heatmap green→red = best→worst variance among ` +
    `<em>passing</em> candidates for that slot. Purple = rejected as ` +
    `clipped (max channel &gt; ${data.maxSlotBrightness}); dark grey = ` +
    `rejected as too dark (mean &lt; ${data.minSlotBrightness}). ` +
    `Winner cell (per-slot best) has a black outline. Rect pixels ` +
    `shown at native size, upscaled with CSS ` +
    `<code>image-rendering: pixelated</code>.</p>`;
  const nav = data.slotNames
    .map((n, i) => `<a href="#slot-${i}">${n}</a>`)
    .join(' · ');
  body += `<p class="nav">Jump to: ${nav}</p>`;
  for (let i = 0; i < data.slotNames.length; i++) {
    body += `<section id="slot-${i}">${slotSectionHtml(i)}</section>`;
  }
  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>sweep-debug ${data.fixture}</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 12px; }
  h2 { margin-top: 24px; }
  table { border-collapse: collapse; margin-bottom: 20px; }
  th, td { padding: 3px; border: 1px solid #ccc; text-align: center; font-size: 11px; }
  th { background: #eee; }
  .cell-inner { display: flex; flex-direction: column; align-items: center; gap: 3px; }
  .cell-inner .s { font-family: monospace; font-size: 10px; }
  .crop { width: 80px; height: 80px; image-rendering: pixelated;
          border: 1px solid #444; background: #222; display: block; }
  .sw { display: inline-block; width: 14px; height: 14px; margin: 0 1px;
        border: 1px solid #444; vertical-align: middle; }
  .miss { color: #999; }
  .hdr { margin: 4px 0 8px 0; }
  .nav a { margin-right: 4px; }
</style>
</head><body>${body}</body></html>`;
  fs.writeFileSync(outPath, html);
}

// Linear-RGB distance between two triples. Squared so it can drive
// argmin without a needless sqrt per candidate.
function linearRgbDist2(
  a: {r: number; g: number; b: number},
  b: {r: number; g: number; b: number},
): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

// Sweeps the horizontal offset of the MULTI ref-card sample rectangles
// over OFFSET_SWEEP candidates and picks the position where the joint
// mean-vs-expected distance across all 4 slots is minimized.
//
// Rationale: the paper mask cutouts sit at 1.75× colPitch past the
// last chip column BY DESIGN, but the chart body has ~0.3" of slop
// inside the card-holder window. When the chart is pushed to the LEFT
// of that slop, the ref cards effectively land at ~2× (~0.15" further
// right in ref-grid terms). The app samples at 1.75× and misses.
//
// Mutates outcome.result.multiRefCards in place so downstream
// buildCaptureEntry emits the corrected values. Also adds an
// `_optimalOffsetPitches` field on the outcome (non-enumerable would
// be cleaner but we just tack it on) for diagnostic logging.
function maybeSweepMultiCardOffset(
  outcome: MunsellChartOutcome,
  fixture: ParsedFixture,
  decoder: NodeDecoder,
): void {
  if (outcome.kind !== 'success') return;
  const result = outcome.result;
  const multi = result.multiRefCards;
  if (!multi || multi.length === 0) return;
  // Need at least two same-row chart chips to derive the horizontal
  // step vector in image (preview) coords. previewRects is row-major
  // per pageSampleGridPoints; for 10YR row 0 that's chips at cols 0..5
  // (indices 0 and 5).
  const previewRects = result.previewRects;
  if (previewRects.length < 6) {
    // Small page (2 chips per row) — not worth sweeping; would need
    // different chip indices per page. Skip for now, log so we notice.
    process.stderr.write(
      `    multi-sweep: page ${fixture.page} has ${previewRects.length} chips; skipping\n`,
    );
    return;
  }
  const rect0 = previewRects[0];
  const rect5 = previewRects[5];
  const c0x = rect0.x + rect0.w / 2;
  const c0y = rect0.y + rect0.h / 2;
  const c5x = rect5.x + rect5.w / 2;
  const c5y = rect5.y + rect5.h / 2;
  // Ref-grid delta between chips (0,0) and (0,5): (10, 0) in ref-grid
  // units (colStep=2 × 5 cols).
  const stepPerRefUnitX = (c5x - c0x) / 10;
  const stepPerRefUnitY = (c5y - c0y) / 10;
  // Scale factor from preview coords → source (DNG/JPEG) coords.
  const sourceW = result.sourceDimensions.width;
  const sourceH = result.sourceDimensions.height;
  const scaleX = sourceW / result.preview.width;
  const scaleY = sourceH / result.preview.height;

  // Per-slot expected colours (drives the scoring). Slots without a
  // known expected are skipped in the score sum — better than
  // defaulting them.
  const expectedByName: Record<string, {r: number; g: number; b: number}> =
    REF_CARD_EXPECTED;
  const scoredNames = multi
    .map(m => m.name)
    .filter(n => expectedByName[n]);
  if (scoredNames.length === 0) return; // nothing to score against

  // 2D cartesian scan: horizontal offset × vertical shift. Compute
  // all candidate rect-sets first, then decode the whole batch in ONE
  // CLI invocation (~6× faster than N sequential invocations because
  // parseDng runs once). Scoring stays in JS and iterates the
  // returned nested array.
  type CandidateMeta = {
    candidate: number;
    vShift: number;
    previewRects: Array<{x: number; y: number; w: number; h: number}>;
  };
  const candidateMeta: CandidateMeta[] = [];
  const roiSets: Roi[][] = [];
  for (const candidate of OFFSET_SWEEP) {
    // Delta in ref-grid units from the app's nominal position to this
    // candidate. colStep=2 → each 1.0 of offsetPitches shifts by 2
    // ref-grid units.
    const hDeltaRefUnits = (candidate - MULTI_CARD_OFFSET_PITCHES) * 2;
    for (const vShift of VERTICAL_SWEEP) {
      // Horizontal shift shares row axis; vertical shift is applied
      // strictly along the chart's row axis via the same ref-grid
      // basis (stepPerRefUnitX/Y), preserving any chart tilt. Row-
      // perpendicular basis = 90° CCW rotation of the col-axis basis:
      // (-stepPerRefUnitY, stepPerRefUnitX). On a portrait capture
      // stepPerRefUnitY ≈ 0 so vShift positive → DOWN in image coords.
      const dxPreview =
        stepPerRefUnitX * hDeltaRefUnits + -stepPerRefUnitY * vShift;
      const dyPreview =
        stepPerRefUnitY * hDeltaRefUnits + stepPerRefUnitX * vShift;
      // Shift each multi ref card by the same combined delta.
      const candRects = multi.map(slot => {
        const cx = slot.rect.x + slot.rect.w / 2 + dxPreview;
        const cy = slot.rect.y + slot.rect.h / 2 + dyPreview;
        return {
          x: Math.round(cx - slot.rect.w / 2),
          y: Math.round(cy - slot.rect.h / 2),
          w: slot.rect.w,
          h: slot.rect.h,
        };
      });
      // Preview → source coords.
      const sourceRois: Roi[] = candRects.map(r => ({
        x: Math.round(r.x * scaleX),
        y: Math.round(r.y * scaleY),
        w: Math.round(r.w * scaleX),
        h: Math.round(r.h * scaleY),
      }));
      candidateMeta.push({candidate, vShift, previewRects: candRects});
      roiSets.push(sourceRois);
    }
  }

  // ONE decode call for the whole batch (dng-cli-cpp) or a per-set
  // loop wrapped for us (Swift dng-cli). See NodeDecoder for the
  // fallback logic.
  let batchResults: LinearRgbReducedWithVar[][];
  const photoRoiFallback: Array<Array<{r: number; g: number; b: number}>> = [];
  try {
    if (fixture.format === 'raw') {
      batchResults = timer.time('sweep.batch_decode', () =>
        decoder.decodeDngRoisReducedBatch(fixture.path, roiSets),
      );
    } else {
      // Photo path — dominant + variance unavailable (see decoder
      // note). Decode each candidate mean, synthesise the
      // LinearRgbReducedWithVar shape with dominant = mean and
      // variance = null so the scoring loop below can stay reducer-
      // agnostic (it only reads .mean when variance is null anyway).
      // Flatten the N candidate sets into ONE call so the Swift CLI
      // loads the JPEG once, samples every ROI in a single process,
      // and returns everything in one shot. Cuts N subprocess
      // spawns (176 per multi fixture) down to 1 — measured ~30×
      // faster wall-clock on typical multi captures.
      batchResults = timer.time('sweep.photo_rois_batch', () => {
        const perSetLens = roiSets.map(s => s.length);
        const flatRois = roiSets.flat();
        const flatMeans = decoder.decodePhotoRois(fixture.path, flatRois);
        const out: LinearRgbReducedWithVar[][] = [];
        let off = 0;
        for (const len of perSetLens) {
          const slice = flatMeans.slice(off, off + len);
          photoRoiFallback.push(slice);
          out.push(
            slice.map(m => ({
              mean: m,
              // No unclamped signal from the JPEG path (Swift CLI
              // returns clamped 0-1 CIImage samples); reuse mean so
              // downstream code can uniformly rely on the field.
              meanUnclamped: m,
              dominant: m,
              variance: null,
            })),
          );
          off += len;
        }
        return out;
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(
      `    multi-sweep: batch decode failed (${msg}); skipping sweep for ${path.basename(fixture.path)}\n`,
    );
    return;
  }
  void photoRoiFallback;

  // Score each candidate PER SLOT INDEPENDENTLY. The multi-card
  // strip has ~0.3" of slop and cards are hand-taped, so slots don't
  // share a single true (H, V) offset — one card can be off-center
  // in a different direction than its neighbours. Joint scoring
  // averages across that mismatch and lands on a compromise no slot
  // is happy with. Per-slot lets each card find its own optimum.
  //
  // Scoring is per-slot variance (intra-ROI, linear-sRGB summed
  // across channels — same "evenness" formula the on-device live
  // overlay uses). Guarded by two per-slot filters:
  //   - Brightness gate: mean channel avg must exceed
  //     MIN_SLOT_BRIGHTNESS. Rejects candidates entirely on the
  //     dark mask-strip material (variance→0 by uniformity).
  //   - Saturation gate: NO mean channel may exceed
  //     MAX_SLOT_BRIGHTNESS. Rejects blown-out samples where the
  //     sensor clipped to 1.0 (variance→0 by clamping, not by
  //     actual uniformity).
  // If a slot has NO passing candidate, its rect is left at the
  // analyzer's chart-derived seed position — better to keep the
  // pre-sweep position than pick a garbage candidate.
  //
  // Diagnostic dump: when SWEEP_DEBUG_MATCH is set and the fixture's
  // basename contains it, print every (H, V) candidate's per-slot
  // samples + score. Zero cost when the env var isn't set.
  // SWEEP_DEBUG_HTML additionally writes an HTML grid with pixel
  // crops of the WHITE slot at every candidate.
  const MIN_SLOT_BRIGHTNESS = 0.04;
  // No mean-based saturation gate. Variance is now computed on the
  // unclamped linear-sRGB pipeline (DngPipeline.cpp) so bright but
  // non-saturated pixels retain a real signal. A patch that's
  // physically saturated (raw at well cap) still shows near-zero
  // variance and gets outranked by any patch with real spatial
  // signal, but not by a false 0. If we see the sweep locking onto
  // truly-flat saturated regions we'll add a variance-plus-mean
  // sanity check; for now let it rank purely on variance.
  const MAX_SLOT_BRIGHTNESS = Infinity;
  const debugMatch = process.env.SWEEP_DEBUG_MATCH;
  const wantDebug =
    !!debugMatch && path.basename(fixture.path).includes(debugMatch);
  const debugHtmlPath = wantDebug ? process.env.SWEEP_DEBUG_HTML : null;
  type DebugRow = {
    candidate: number;
    vShift: number;
    samples: Array<{r: number; g: number; b: number}>;
    variances: Array<{r: number; g: number; b: number} | null>;
    // Preview-space sample rect PER SLOT — used to crop the actual
    // preview pixels for the per-slot heatmap grid in the debug HTML.
    rects: Array<{x: number; y: number; w: number; h: number}>;
  };
  const debugRows: DebugRow[] = [];
  // Per-slot best-tracking. Each slot independently picks the (H, V)
  // that minimises its OWN linear-sRGB variance (post-brightness /
  // saturation guards). If no candidate passes for a slot, its rect
  // is left at the pre-sweep chart-derived seed — better than
  // picking a garbage candidate.
  type SlotBest = {
    score: number;
    mean: {r: number; g: number; b: number};
    meanUnclamped: {r: number; g: number; b: number} | null;
    dominant: {r: number; g: number; b: number} | null;
    rect: {x: number; y: number; w: number; h: number};
    candidate: number;
    vShift: number;
  };
  const bestPerSlot: Array<SlotBest | null> = new Array(multi.length).fill(
    null,
  );
  const haveVariance = batchResults.every(inner =>
    inner.every(r => r.variance !== null),
  );

  for (let idx = 0; idx < batchResults.length; idx++) {
    const reduced = batchResults[idx];
    if (!reduced || reduced.length !== multi.length) continue;
    const {candidate, vShift, previewRects: candRects} = candidateMeta[idx];
    const samples = reduced.map(r => r.mean);
    let summedVarForDebug = 0;

    for (let i = 0; i < multi.length; i++) {
      const mean = samples[i];
      const brightness = (mean.r + mean.g + mean.b) / 3;
      const maxChan = Math.max(mean.r, mean.g, mean.b);
      // Gates applied PER SLOT so a saturated white doesn't
      // disqualify a candidate that has a valid greycard.
      //   Brightness: reject if entirely on dark mask-strip
      //     material (variance→0 by uniform blackness).
      //   Saturation: reject if the sensor clipped at 1.0
      //     (variance→0 by clamping in sensorToLinearSrgb, not
      //     by actual uniformity — see docs on the linear-sRGB
      //     clamp; the clamp is a display convenience that
      //     unfortunately erases the variance signal on
      //     over-exposed patches).
      let slotScore: number;
      if (haveVariance) {
        const v = reduced[i].variance!;
        slotScore = v.r + v.g + v.b;
        summedVarForDebug += slotScore;
      } else {
        // Photo-path fallback: distance-from-expected on the three
        // physical neutrals (postit excluded — see the old-scorer
        // comment on why it's a "similarity magnet").
        const name = multi[i].name;
        if (name === 'postit') continue;
        const exp = expectedByName[name];
        if (!exp) continue;
        slotScore = linearRgbDist2(mean, exp);
      }
      if (brightness < MIN_SLOT_BRIGHTNESS) continue;
      if (maxChan > MAX_SLOT_BRIGHTNESS) continue;
      const cur = bestPerSlot[i];
      if (!cur || slotScore < cur.score) {
        bestPerSlot[i] = {
          score: slotScore,
          mean,
          // Carry the unclamped mean through when the decoder
          // exposes it (RAW path via dng-cli-cpp). Downstream WB
          // gain uses it to avoid under-correcting on bright
          // anchors — see wbRgbScaleFromReference.
          meanUnclamped: reduced[i].meanUnclamped ?? null,
          dominant: fixture.format === 'raw' ? reduced[i].dominant : null,
          rect: candRects[i],
          candidate,
          vShift,
        };
      }
    }

    if (wantDebug) {
      const parts = [
        `H=${candidate.toFixed(2)}`,
        `V=${vShift.toFixed(2)}`,
        `summed-var=${summedVarForDebug.toExponential(3)}`,
      ];
      for (let i = 0; i < multi.length; i++) {
        const s = samples[i];
        const name = multi[i].name;
        parts.push(
          `${name}=(${s.r.toFixed(3)},${s.g.toFixed(3)},${s.b.toFixed(3)})`,
        );
      }
      process.stderr.write(`    sweep-debug: ${parts.join(' ')}\n`);
      debugRows.push({
        candidate,
        vShift,
        samples: samples.map(s => ({...s})),
        variances: reduced.map(r => (r.variance ? {...r.variance} : null)),
        rects: candRects.map(r => ({...r})),
      });
    }
  }

  if (wantDebug && debugHtmlPath && !haveVariance) {
    // The debug HTML colour-codes cells by intra-ROI variance —
    // meaningless for the photo/JPEG path (variance not computed).
    // Skip emission so we don't overwrite a preceding DNG debug HTML
    // when the same fixture stem produces both formats.
    process.stderr.write(
      `    sweep-debug: skipping HTML for ${fixture.format} (no variance data)\n`,
    );
  } else if (wantDebug && debugHtmlPath) {
    // Per-slot winners: each slot has its own bestPerSlot entry
    // (or null if it fell back to the seed). The debug HTML renders
    // one H×V grid per slot with its own winner outline.
    let previewPixels: Uint8Array | null = null;
    let previewW = 0;
    let previewH = 0;
    try {
      const preview =
        fixture.format === 'raw'
          ? decoder.readPreviewRgb(fixture.path, 1200)
          : decoder.readPreviewRgbPhoto(fixture.path, 1200);
      previewPixels = new Uint8Array(preview.pixels);
      previewW = preview.width;
      previewH = preview.height;
    } catch (err) {
      process.stderr.write(
        `    sweep-debug: preview render failed (${(err as Error).message ?? err}); ` +
          `HTML will omit pixel crops\n`,
      );
    }
    const winners = bestPerSlot.map(b =>
      b ? {h: b.candidate, v: b.vShift, score: b.score} : null,
    );
    writeSweepDebugHtml(debugHtmlPath, {
      fixture: path.basename(fixture.path),
      rows: debugRows,
      slotNames: multi.map(m => m.name),
      expectedByName,
      winners,
      minSlotBrightness: MIN_SLOT_BRIGHTNESS,
      maxSlotBrightness: MAX_SLOT_BRIGHTNESS,
      preview:
        previewPixels && previewW > 0 && previewH > 0
          ? {pixels: previewPixels, width: previewW, height: previewH}
          : null,
    });
    process.stderr.write(`    sweep-debug: wrote ${debugHtmlPath}\n`);
  }

  // Union of every candidate rect per slot — the "search area" the
  // sweep considered. Stored on each slot so run.html can render an
  // overlay ("did we sweep where the card actually is?"). Cheap
  // single pass over the meta we already built above.
  const searchAreaPerSlot = multi.map((_, i) => {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const meta of candidateMeta) {
      const r = meta.previewRects[i];
      if (r.x < minX) minX = r.x;
      if (r.y < minY) minY = r.y;
      if (r.x + r.w > maxX) maxX = r.x + r.w;
      if (r.y + r.h > maxY) maxY = r.y + r.h;
    }
    if (!isFinite(minX)) return null;
    return {
      x: Math.round(minX),
      y: Math.round(minY),
      w: Math.round(maxX - minX),
      h: Math.round(maxY - minY),
    };
  });

  // Mutate in place per-slot. Slots with no passing candidate keep
  // their pre-sweep seed rect (analyzer's chart-derived nominal
  // MULTI_CARD_POINTS position).
  for (let i = 0; i < multi.length; i++) {
    const best = bestPerSlot[i];
    multi[i] = {
      ...multi[i],
      ...(best
        ? {
            linearRgb: best.mean,
            linearRgbUnclamped: best.meanUnclamped,
            linearRgbDominant: best.dominant,
            rect: best.rect,
          }
        : {}),
      searchArea: searchAreaPerSlot[i],
    };
  }
  // Diagnostics: per-slot chosen (H, V) + score. buildCaptureEntry
  // emits this array into run.json so downstream can facet on it
  // ("what fraction of shots had white pinned at the H boundary?").
  const perSlotChoices = bestPerSlot.map((b, i) => ({
    name: multi[i].name,
    h: b ? b.candidate : null,
    v: b ? b.vShift : null,
    score: b ? b.score : null,
  }));
  (outcome as any)._sweepPerSlot = perSlotChoices;
  const summary = perSlotChoices
    .map(c =>
      c.h == null
        ? `${c.name}=seed`
        : `${c.name}=(${c.h.toFixed(2)},${c.v!.toFixed(2)})`,
    )
    .join(' ');
  process.stderr.write(
    `    multi-sweep: ${summary} for ${path.basename(fixture.path)}\n`,
  );
}

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
    // Rescue knobs applied uniformly to every fixture's analyzer
    // guide rect. Fractions of preview width/height for the shifts;
    // multiplicative for the scale. See GuideAdjustment in
    // chartAnalysis.ts for rationale. Useful when a batch of shots
    // is systematically off-frame (Pixel devices that don't support
    // DISTORTION_CORRECTION_MODE_OFF, or fixtures captured before a
    // WYSIWYG fix landed on the phone).
    'guide-shift-x': {type: 'string'},
    'guide-shift-y': {type: 'string'},
    'guide-scale': {type: 'string'},
    // Force the reference-mode on every fixture, ignoring the token
    // in the filename. Useful when a batch was captured with the wrong
    // ref-mode in the friendly stem (e.g. app defaulted to 'nothing'
    // even though all shots had 3 cards taped alongside) AND the
    // fixture files can't be renamed at rest (gdrive-hosted, mostly).
    // Value must be one of REFERENCE_TOKENS (multi / whibal / postit /
    // greycard / nothing / none).
    'override-ref': {type: 'string'},
    // Comma-separated substring filters applied to each fixture's
    // full path (parent directories + filename, lowercased). A
    // fixture is kept only if EVERY token appears somewhere in that
    // path. Handy for restricting a run to e.g. burst frame #1
    // ("burst1of5") or a specific illumination ("light7") to iterate
    // faster / keep the HTML report a manageable size.
    filter: {type: 'string'},
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

// Assemble the GuideAdjustment from the three cmdline knobs. Any of
// them being set produces an object; all missing → undefined (no
// adjustment).
const parseNum = (name: string, raw: string | undefined): number | undefined => {
  if (raw === undefined) return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n)) die(`invalid ${name}: ${raw}`);
  return n;
};
const guideAdjustment =
  values['guide-shift-x'] !== undefined ||
  values['guide-shift-y'] !== undefined ||
  values['guide-scale'] !== undefined
    ? {
        shiftX: parseNum('--guide-shift-x', values['guide-shift-x']),
        shiftY: parseNum('--guide-shift-y', values['guide-shift-y']),
        scale: parseNum('--guide-scale', values['guide-scale']),
      }
    : undefined;
if (guideAdjustment) {
  process.stderr.write(
    `guideAdjustment: shiftX=${guideAdjustment.shiftX ?? 0} ` +
      `shiftY=${guideAdjustment.shiftY ?? 0} ` +
      `scale=${guideAdjustment.scale ?? 1}\n`,
  );
}

const overrideRef = values['override-ref'];
if (overrideRef !== undefined) {
  if (!REFERENCE_TOKENS.has(overrideRef.toLowerCase())) {
    die(
      `invalid --override-ref "${overrideRef}"; must be one of: ` +
        Array.from(REFERENCE_TOKENS).join(', '),
    );
  }
  process.stderr.write(
    `override-ref: forcing every fixture's reference to "${overrideRef.toLowerCase()}"\n`,
  );
}

// --filter tokens are AND-ed: every token must appear somewhere in the
// fixture's relative path (parent dirs + filename), lowercased. Uses
// the path relative to fixturesDir so tokens can match session
// folder names (e.g. "0824 open shade") as easily as filename tokens
// like "burst1of5". Declared before scanFixtures so the same
// predicate can prune the JPEG-sibling extraction pass — otherwise
// we'd auto-extract a preview JPEG from every DNG in the tree
// before the filter shrinks the list.
const filterTokens = values.filter
  ? values.filter
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
  : [];
const pathMatchesFilter = (p: string): boolean => {
  if (filterTokens.length === 0) return true;
  const relLower = path.relative(fixturesDir!, p).toLowerCase();
  return filterTokens.every(tok => relLower.includes(tok));
};

process.stderr.write(`scanning ${fixturesDir}\n`);
const allFixtures = scanFixtures(fixturesDir!, DNG_CLI, pathMatchesFilter);
// Apply --override-ref post-scan so every fixture takes the same
// reference regardless of its filename token. reference_card in the
// JSON + which per-fixture WB sweep runs (multi expands to 4 refs)
// both key off this field, so we mutate here rather than at fixture
// consumption sites.
if (overrideRef !== undefined) {
  const forced = overrideRef.toLowerCase();
  for (const f of allFixtures) {
    f.reference = forced;
  }
}
const pageFilter = values.pages
  ? new Set(
      values.pages
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean),
    )
  : null;
// scanFixtures already applied pathMatchesFilter, so allFixtures is
// pre-filtered by --filter. Only --pages needs applying here.
const fixtures = pageFilter
  ? allFixtures.filter(f => pageFilter.has(f.page.toLowerCase()))
  : allFixtures;
const filterNotes: string[] = [];
if (pageFilter) {
  filterNotes.push(`pages=[${[...pageFilter].join(', ')}]`);
}
if (filterTokens.length > 0) {
  filterNotes.push(`filter=[${filterTokens.join(', ')}]`);
}
process.stderr.write(
  `found ${allFixtures.length} fixture(s)` +
    (filterNotes.length > 0
      ? ` — filtered to ${fixtures.length} for ${filterNotes.join(' + ')}`
      : '') +
    `; refs=[${refNotations.join(', ')}]\n`,
);

// One-shot exiftool call for every fixture path so per-capture
// buildCaptureJson can attach camera / DNG-tag metadata without
// spawning per capture.
const uniqueFixturePaths = Array.from(new Set(fixtures.map(f => f.path)));
process.stderr.write(
  `prefetching metadata for ${uniqueFixturePaths.length} fixture file(s) via exiftool…\n`,
);
const imageMetadataByPath = timer.time('exiftool.prefetch', () =>
  prefetchImageMetadata(uniqueFixturePaths),
);

// Two decoders — Android fixtures route their DNG methods through
// the C++ CLI (byte-for-byte match with the on-device Android
// decoder); iOS + unknown-platform fixtures use the Swift CLI
// (CIRAWFilter, matches the on-device iOS decoder). Photo methods
// go through the Swift CLI regardless — JPEG decode is universal.
const iosDecoder = new NodeDecoder(DNG_CLI);
// If ANY fixture in this run is Android, dng-cli-cpp MUST be built.
// We refuse to silently fall back to the Swift CLI (CIRAWFilter) for
// Android DNGs — that would give "Apple decoding an Android
// capture" results and invalidate the raw-vs-jpeg A/B measurement
// that this whole pipeline exists to make.
const hasAndroidFixture = fixtures.some(f => f.platform === 'android');
if (hasAndroidFixture && !fs.existsSync(DNG_CLI_CPP)) {
  die(
    `Android fixtures detected but dng-cli-cpp not built at\n` +
      `  ${DNG_CLI_CPP}\n` +
      `Run: npm run build:dng-cli-cpp`,
  );
}
const androidDecoder = hasAndroidFixture
  ? new NodeDecoder(DNG_CLI_CPP, DNG_CLI, /*supportsBatch*/ true)
  : null;
const decoderFor = (f: ParsedFixture) =>
  f.platform === 'android' ? androidDecoder! : iosDecoder;
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
      outcome = await timer.timeAsync('chart.analyze', () =>
        analyzeMunsellChart(
          decoder,
          fixture.path,
          page,
          fixture.format,
          undefined,
          fixture.reference === 'multi',
          false,
          guideAdjustment,
        ),
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
      // Post-hoc horizontal sweep of the multi-card sample positions.
      // Compensates for physical mask/chart misalignment (the printout
      // has ~0.3" of horizontal slop between the Munsell chart body and
      // the paper mask's ref-card cutouts — depending on how the chart
      // sits in the holder, the ref cards land anywhere from
      // 1.75× to ~2.25× colPitch past the last chip column). Sweeps
      // candidate offsets, picks the position where the sample means
      // best match the expected card colours, mutates the outcome's
      // multiRefCards in place. See docs/munsell-dark-sensor.md option
      // #1 for the general "sensor-vs-expected" motivation.
      if (fixture.reference === 'multi') {
        timer.time('sweep.multi', () =>
          maybeSweepMultiCardOffset(outcome, fixture, decoder),
        );
      }
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
    // Preview coord dims — the analyzer's preview-space size, used by
    // the whitemask overlay SVG to align its rects with the encoded
    // preview image. Available on success (outcome.result.preview) AND
    // on failure/registered outcomes (outcome.debug.preview) so the
    // report can still show the source image + guide rect + any partial
    // overlays even when analysis didn't run to completion.
    let previewCoord: {width: number; height: number} | null = null;
    if (outcome.kind === 'success') {
      previewCoord = {
        width: outcome.result.preview.width,
        height: outcome.result.preview.height,
      };
    } else if (
      (outcome.kind === 'failure' || outcome.kind === 'registered') &&
      outcome.debug.preview
    ) {
      previewCoord = {
        width: outcome.debug.preview.width,
        height: outcome.debug.preview.height,
      };
    }
    let previewImage: CaptureContext['previewImage'] | undefined;
    if (emitHtml && previewCoord) {
      try {
        const rendered = timer.time('preview.render_for_report', () =>
          decoder.renderPreviewImage(
            fixture.path,
            REPORT_PREVIEW_MAX_DIM,
            fixture.format,
            REPORT_PREVIEW_QUALITY,
          ),
        );
        previewImage = {
          base64: rendered.bytes.toString('base64'),
          ext: rendered.ext,
          encodedWidth: rendered.width,
          encodedHeight: rendered.height,
          coordWidth: previewCoord.width,
          coordHeight: previewCoord.height,
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
    // own WB-anchored capture entry alongside the AUTO one. Paper
    // joins the sweep on LIGHT BG shots (it's derived from the
    // whitemask border ring, which only samples paper there).
    // A user-provided --refs list is used verbatim.
    const perFixtureRefs = fixture.reference === 'multi' && !values.refs
      ? (isLightBgPath(fixture.path)
          ? [REF_AUTO, 'whibal', 'postit', 'greycard', 'white', 'paper']
          : [REF_AUTO, 'whibal', 'postit', 'greycard', 'white'])
      : refNotations;
    for (const refLabel of perFixtureRefs) {
      const anchor = resolveAnchor(refLabel, fixture, outcome);
      if (!anchor) {
        process.stderr.write(
          `    skip anchor "${refLabel}" on ${path.basename(fixture.path)}: unresolvable\n`,
        );
        continue;
      }
      const jsonEntry = timer.time('buildCaptureEntry', () =>
        buildCaptureEntry(fixture, refLabel, anchor, outcome, page),
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

  // Burst averaging (docs/munsell-dark-sensor.md option #3). Detect
  // groups of `_burstNofM` captures sharing the same fixture context
  // and WB anchor. For each group, emit a synthetic averaged capture
  // computed by taking each frame's per-cell raw_linear_rgb (from that
  // frame's own chart detection — chart alignment is baked in) and
  // averaging. Then re-derive WB gain from the averaged anchor raw,
  // apply per-channel to each averaged cell raw → measured, and
  // recompute ΔE2000 vs expected in Lab. Individual frame captures are
  // preserved so the report shows both.
  const {captures: burstAvgCaptures, contexts: burstAvgContexts} =
    buildBurstAverageCaptures(captures, captureContexts);
  if (burstAvgCaptures.length > 0) {
    process.stderr.write(
      `burst averaging: emitting ${burstAvgCaptures.length} synthetic burstavg capture(s)\n`,
    );
    captures.push(...burstAvgCaptures);
    captureContexts.push(...burstAvgContexts);
    nSuccess += burstAvgCaptures.length;
  }

  // Excluded-chips list — chips flagged as physically defective /
  // drifted from spec. Filmstrip + run.html read this to hide / mark
  // affected cells. Missing file is treated as "no exclusions" so
  // developers who haven't done the calibration analysis get sensible
  // defaults.
  const excludedChipsPath = path.resolve(__dirname, 'excluded-chips.json');
  let excludedChips: string[] = [];
  if (fs.existsSync(excludedChipsPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(excludedChipsPath, 'utf-8'));
      if (Array.isArray(raw?.chips)) {
        excludedChips = raw.chips
          .map((c: any) => (typeof c === 'string' ? c : c?.notation))
          .filter((n: unknown): n is string => typeof n === 'string');
      }
    } catch (e) {
      process.stderr.write(
        `warning: failed to parse ${excludedChipsPath} (${(e as Error).message})\n`,
      );
    }
  }
  process.stderr.write(
    `excluded chips: ${excludedChips.length ? excludedChips.join(', ') : '(none)'}\n`,
  );

  // Excluded-cards list — whole fixtures (raw + photo of the same
  // shutter) flagged as having bad registration, mis-framing, chart
  // damage, etc. Same schema as excluded-chips.json but keyed on
  // fixture label (source_path basename minus extension). Consumed
  // by the greycard ranking table (strikethrough) and the filmstrip
  // (default-on checkbox to filter them out).
  const excludedCardsPath = path.resolve(__dirname, 'excluded-cards.json');
  let excludedCards: string[] = [];
  if (fs.existsSync(excludedCardsPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(excludedCardsPath, 'utf-8'));
      if (Array.isArray(raw?.cards)) {
        excludedCards = raw.cards
          .map((c: any) => (typeof c === 'string' ? c : c?.label))
          .filter((n: unknown): n is string => typeof n === 'string');
      }
    } catch (e) {
      process.stderr.write(
        `warning: failed to parse ${excludedCardsPath} (${(e as Error).message})\n`,
      );
    }
  }
  process.stderr.write(
    `excluded cards: ${excludedCards.length ? excludedCards.join(', ') : '(none)'}\n`,
  );

  const runMeta = {
    schema_version: SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    fixtures_root: fixturesDir!,
    n_fixtures: fixtures.length,
    n_success: nSuccess,
    n_failure: nFailure,
    excluded_chips: excludedChips,
    excluded_cards: excludedCards,
  };
  const output = {...runMeta, captures};

  fs.mkdirSync(path.dirname(outPath!), {recursive: true});
  timer.time('json.write', () =>
    fs.writeFileSync(outPath!, JSON.stringify(output, null, 2) + '\n'),
  );

  if (emitHtml) {
    // HTML report next to the JSON. Derive path by swapping .json → .html
    // (or appending .html if the out arg doesn't end with .json).
    const reportPath = outPath!.endsWith('.json')
      ? outPath!.replace(/\.json$/, '.html')
      : `${outPath}.html`;
    const html = timer.time('report.render', () =>
      renderHtmlReport(runMeta, captureContexts),
    );
    timer.time('report.write', () => fs.writeFileSync(reportPath, html));
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
  process.stderr.write(`\nphase timing (sorted by wall time):\n${timer.report()}\n`);
})().catch(err => {
  iosDecoder.cleanup();
  androidDecoder?.cleanup();
  die(`fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
});
