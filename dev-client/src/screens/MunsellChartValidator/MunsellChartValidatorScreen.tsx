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

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Text as RNText,
  StyleSheet,
  View,
} from 'react-native';
import Share from 'react-native-share';
import Svg, {
  Circle,
  Defs,
  Line,
  Path,
  Pattern,
  Rect,
  Image as SvgImage,
  Text as SvgText,
} from 'react-native-svg';

import {
  cacheDirectory,
  EncodingType,
  writeAsStringAsync,
} from 'expo-file-system/legacy';

import DeltaE from 'delta-e';
import {linearRgbToXyz, xyzToLab} from 'munsell/dist/src/colorspace';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {Select} from 'terraso-mobile-client/components/inputs/Select';
import {
  Box,
  Column,
  Paragraph,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {SafeScrollView} from 'terraso-mobile-client/components/safeview/SafeScrollView';
import {useCustomReferences} from 'terraso-mobile-client/model/color/customReferences';
import {
  listAvailableReferences,
  type AvailableReference,
} from 'terraso-mobile-client/model/color/getColorFromLinearRgb';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {
  analyzeMunsellChart,
  applyWbCorrection,
  computeCellResults,
  csvFromCells,
  DEFAULT_REFERENCE_NOTATION,
  TEST_SWATCH_REFERENCE_NOTATION,
  type CellMeasurement,
  type MunsellCellResult,
  type MunsellChartFailureDebug,
  type MunsellChartResult,
} from 'terraso-mobile-client/screens/MunsellChartValidator/chartAnalysis';
import {computeChartGuideRect} from 'terraso-mobile-client/screens/MunsellChartValidator/chartGuide';
import {DEFAULT_WHITE_MASK_PARAMS} from 'terraso-mobile-client/screens/MunsellChartValidator/imageOps';
import {
  DEFAULT_REGISTRATION_ALGORITHM,
  type RegistrationAlgorithm,
} from 'terraso-mobile-client/screens/MunsellChartValidator/matchAlgorithm';
import {
  CHART_CHROMAS,
  CHART_VALUES,
} from 'terraso-mobile-client/screens/MunsellChartValidator/munsellChart10YR';
import {
  findMunsellPage,
  type MunsellPage,
} from 'terraso-mobile-client/screens/MunsellChartValidator/munsellPages';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';

// Dev tool: point at a captured DNG of the 10YR Munsell soil-colour
// card, auto-register the chart in the image, decode all ~32 swatches,
// compare each measured colour to its published Munsell notation, and
// render a comparison grid the tester can share.
//
// Nav route: MUNSELL_CHART_VALIDATOR. Params:
//   - dngPath: file:// URI from a fresh RAW capture (or a loaded file).
//   - pageHue: the Munsell page hue the DNG was shot against ('10YR',
//     '7.5YR', etc.). Picked by the user on the RAW_COLOR_TOOLS screen
//     before capture so the analyzer can use that page's SPECIFIC hole
//     layout for RANSAC (instead of the universal MAX grid, which lets
//     shifted-by-one fits win when they match a paper false-positive).

export type MunsellChartValidatorProps = {
  // File path to the image being analyzed. Called `dngPath` for
  // historical reasons but with `format='photo'` it's any format
  // CIImage can open (JPEG / HEIC / PNG).
  dngPath: string;
  pageHue: string;
  // Which decoder path to route through: 'raw' → CIRAWFilter (DNG),
  // 'photo' → CIImage (JPEG / HEIC / etc.). Downstream analysis is
  // identical for both.
  format: 'raw' | 'photo';
  // Which registration algorithm to run against the detected holes.
  // Picked on the RAW_COLOR_TOOLS screen before capture; defaults to
  // the constrained-random pair-similarity implementation if not set.
  algorithm?: RegistrationAlgorithm;
};

// SVG layout (fixed-pixel viewBox — easier to reason about text sizing
// than a fractional viewBox). The `EXPORT_SCALE` multiplier below then
// renders the whole thing at 4× when saving to PNG for share, so the
// exported image is high-DPI-crisp regardless of what the viewBox is
// sized at.
const SVG_WIDTH = 800;
const HEADER_H = 50;
// 130 rather than 70 so multi-char row labels ("7.5YR /1", "10YR /2",
// etc.) don't get clipped on WHITE / mixed-hue pages. Standard-page
// single-digit value labels (2..8) still fit comfortably.
const LABEL_W = 130;
const CELL_W = (SVG_WIDTH - LABEL_W) / CHART_CHROMAS.length;
const CELL_H = 130;
// Legend band above the grid. Explains what the two swatches, the
// two Munsell notations, and the background heatmap mean.
const LEGEND_H = 260;
const GRID_START_Y = LEGEND_H;
// +1 row of chart-height reserves a below-the-grid slot for the ref
// card cell (drawn at data row nRows in ResultSvg).
const SVG_HEIGHT =
  LEGEND_H + HEADER_H + CELL_H * (CHART_VALUES.length + 1) + 40;

// Font sizes are absolute in viewBox units. Bumped up (was 20/11/12)
// so the rendered image is legible without needing to zoom.
const FONT_HEADER = 28;
const FONT_NOTATION = 17;
const FONT_DELTAE = 20;

// react-native-svg's toDataURL on iOS draws using the on-screen
// SVG's own bounds, not the width/height options passed in — so
// passing a big width just gives you a big empty canvas with the
// content still rendered at the on-screen size. Workaround: mount a
// second SVG off-screen at the desired export size, then call
// toDataURL on that instance (with no options). It renders at its
// own on-screen bounds × device scale, giving a proper high-res PNG.
//
// EXPORT_CSS_WIDTH is in CSS points; the actual PNG comes back at
// EXPORT_CSS_WIDTH × [UIScreen.mainScreen.scale] pixels (2× or 3×
// on retina). 1600pt → ~3200-4800px, plenty for pinch-zoom.
const EXPORT_CSS_WIDTH = 1600;
const EXPORT_CSS_HEIGHT = Math.round(
  EXPORT_CSS_WIDTH * (SVG_HEIGHT / SVG_WIDTH),
);

// Colour a cell's background by ΔE. Rough visual quality gate:
// < 3 excellent, < 6 acceptable, < 12 noticeable, >= 12 bad.
const deltaEColor = (deltaE: number): string => {
  if (deltaE < 3) return '#c8f5c8';
  if (deltaE < 6) return '#e6f5c8';
  if (deltaE < 12) return '#f5e6c8';
  return '#f5c8c8';
};

const rgbToHex = (rgb: {r: number; g: number; b: number}): string => {
  const c = (v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    // Rough gamma-encode so preview swatches read as approximate sRGB
    // (both expected + measured are stored linear; the SVG viewer
    // expects sRGB values).
    const srgb =
      clamped <= 0.0031308
        ? 12.92 * clamped
        : 1.055 * clamped ** (1 / 2.4) - 0.055;
    const byte = Math.round(Math.max(0, Math.min(1, srgb)) * 255);
    return byte.toString(16).padStart(2, '0');
  };
  return `#${c(rgb.r)}${c(rgb.g)}${c(rgb.b)}`;
};

export const MunsellChartValidatorScreen = ({
  dngPath,
  pageHue,
  format,
  algorithm = DEFAULT_REGISTRATION_ALGORITHM,
}: MunsellChartValidatorProps) => {
  const navigation = useNavigation();
  const [state, setState] = useState<
    | {kind: 'analyzing'}
    | {kind: 'ready'; result: MunsellChartResult}
    // 'failed' carries structured debug info (preview PNG, partial
    // grid, luma thresholds) so the dev UI can render the same source
    // overlay as the success path plus the failure reason, alongside
    // Share DNG / Share white mask buttons.
    | {kind: 'failed'; debug: MunsellChartFailureDebug}
    // 'error' is the truly-unexpected exception path (native decoder
    // crash, out-of-memory, etc.) — no partial data, just the message.
    | {kind: 'error'; message: string}
  >({kind: 'analyzing'});
  // On-screen SVG (fills the scroll view width). Not used for export
  // because it's at layout size, not export size.
  const onScreenSvgRef = useRef<Svg>(null);
  // Off-screen export SVG at the fixed EXPORT_CSS_WIDTH × EXPORT_CSS_HEIGHT
  // size — this is what we hand to toDataURL.
  const exportSvgRef = useRef<Svg>(null);
  // Off-screen SVG for the white-mask debug PNG export. Sized to the
  // preview's own pixel dimensions so toDataURL produces a full-res
  // bitmap the tester can pinch-zoom to inspect the mask.
  const whiteMaskExportSvgRef = useRef<Svg>(null);
  // Separate ref for the FAILURE state — its own SVG instance lives
  // inside FailedView (mounted only when kind === 'failed'), so it
  // has to be a distinct ref from the ready-state one. shareWhiteMask
  // picks whichever is populated based on the current state.
  const failedWhiteMaskExportSvgRef = useRef<Svg>(null);
  const [sharing, setSharing] = useState(false);
  const [view, setView] = useState<'grid' | 'source'>('grid');
  // Cell notation the tester picked as WB reference. Default to a
  // near-neutral mid-value cell. Tapping any swatch on the grid
  // re-computes everything against that cell.
  const [referenceNotation, setReferenceNotation] = useState<string | null>(
    DEFAULT_REFERENCE_NOTATION,
  );
  // Bradford chromatic adaptation toggle. Off = per-channel RGB gain
  // (simpler, fine for near-neutral references under neutral light).
  // On = LMS-space Bradford adaptation (more accurate for tinted
  // illuminants or strongly chromatic reference cells).
  const [useBradford, setUseBradford] = useState(false);
  // Which Munsell page this DNG is of — passed as a nav param from
  // the RAW & color tools screen (the user picks it there before
  // capture so the analyzer can use the page's SPECIFIC hole layout
  // for RANSAC).
  const page = useMemo(() => findMunsellPage(pageHue), [pageHue]);
  // Test-swatch reference — a built-in or user-calibrated colour
  // reference (Post-it yellow, gray card, etc.) that gets sampled from
  // the DNG at TEST_SWATCH_POINT (bottom-right corner of the 7×6 chart
  // grid, always empty on the physical chart). Compared vs. the picked
  // reference's expected colour in the bottom-right cell of the result
  // grid. Default to the Post-it built-in.
  const customRefs = useCustomReferences();
  const availableRefs = useMemo(
    () => listAvailableReferences(customRefs),
    [customRefs],
  );
  const [testRefId, setTestRefId] = useState<string>('builtin:POST_IT_YELLOW');
  const testRef: AvailableReference | undefined = useMemo(
    () => availableRefs.find(r => r.id === testRefId) ?? availableRefs[0],
    [availableRefs, testRefId],
  );
  // Resolve the WB reference measurement. If the user tapped the
  // test-swatch cell, build a synthetic CellMeasurement from the
  // picked reference's expected colour + the DNG sample at the
  // test-swatch position. Otherwise look up a real cell by notation.
  // Hoisted out of the `cells` useMemo so the test-swatch's corrected
  // measured colour can reuse it via applyWbCorrection below.
  const testMeasuredRaw =
    state.kind === 'ready' ? (state.result.testSwatchLinearRgb ?? null) : null;
  const ref: CellMeasurement | undefined = useMemo(() => {
    if (state.kind !== 'ready') return undefined;
    if (
      referenceNotation === TEST_SWATCH_REFERENCE_NOTATION &&
      testRef &&
      testMeasuredRaw
    ) {
      return {
        cell: {
          hue: 'TEST',
          value: 0,
          chroma: 0,
          notation: TEST_SWATCH_REFERENCE_NOTATION,
          expectedLinearRgb: testRef.linearRgb,
          rowIdx: -1,
          colIdx: -1,
        },
        rawLinearRgb: testMeasuredRaw,
      };
    }
    if (referenceNotation != null) {
      return state.result.measurements.find(
        m => m.cell.notation === referenceNotation,
      );
    }
    return undefined;
  }, [state, referenceNotation, testRef, testMeasuredRaw]);
  const cells = useMemo(
    () =>
      state.kind === 'ready'
        ? computeCellResults(state.result.measurements, ref, useBradford)
        : [],
    [state, ref, useBradford],
  );
  // WB-corrected test-swatch measured colour — mirrors what
  // computeCellResults does per Munsell cell, so tapping a Munsell
  // reference cell shifts the test-swatch's measured colour the same
  // way it shifts every other cell.
  const testMeasuredCorrected = useMemo(
    () =>
      testMeasuredRaw
        ? applyWbCorrection(testMeasuredRaw, ref, useBradford)
        : null,
    [testMeasuredRaw, ref, useBradford],
  );

  useEffect(() => {
    // Re-run when the selected page changes — analyzeMunsellChart uses
    // page.cells to build the per-cell sample rects, so a page swap
    // resamples the DNG at the right chip positions.
    setState({kind: 'analyzing'});
    (async () => {
      try {
        const outcome = await analyzeMunsellChart(
          dngPath,
          page,
          format,
          algorithm,
        );
        if (outcome.kind === 'success') {
          setState({kind: 'ready', result: outcome.result});
        } else {
          setState({kind: 'failed', debug: outcome.debug});
        }
      } catch (err) {
        console.error('Munsell chart analysis failed:', err);
        setState({kind: 'error', message: String(err)});
      }
    })();
  }, [dngPath, page, format, algorithm]);

  const shareAsImage = useCallback(() => {
    const svg = exportSvgRef.current;
    if (!svg) return;
    setSharing(true);
    // No width/height options here — the off-screen SVG's own bounds
    // (EXPORT_CSS_WIDTH × EXPORT_CSS_HEIGHT) are what get rendered,
    // × the device's screen scale.
    (
      svg as unknown as {
        toDataURL: (cb: (b64: string) => void, opts?: object) => void;
      }
    ).toDataURL(async (base64: string) => {
      try {
        const outPath = `${cacheDirectory}munsell-chart-result.png`;
        await writeAsStringAsync(outPath, base64, {
          encoding: EncodingType.Base64,
        });
        await Share.open({
          url: outPath.startsWith('file://') ? outPath : `file://${outPath}`,
          type: 'image/png',
          failOnCancel: false,
        });
      } catch (err) {
        console.error('Munsell result share failed:', err);
      } finally {
        setSharing(false);
      }
    });
  }, []);

  const shareAsCsv = useCallback(async () => {
    setSharing(true);
    try {
      const csv = csvFromCells(cells, referenceNotation);
      const outPath = `${cacheDirectory}munsell-chart-result.csv`;
      await writeAsStringAsync(outPath, csv, {encoding: EncodingType.UTF8});
      await Share.open({
        url: outPath.startsWith('file://') ? outPath : `file://${outPath}`,
        type: 'text/csv',
        failOnCancel: false,
      });
    } catch (err) {
      console.error('Munsell result CSV share failed:', err);
    } finally {
      setSharing(false);
    }
  }, [cells, referenceNotation]);

  const shareDng = useCallback(async () => {
    setSharing(true);
    try {
      await Share.open({
        url: dngPath.startsWith('file://') ? dngPath : `file://${dngPath}`,
        // DNG has no universal MIME type; image/x-adobe-dng is the
        // closest, and Share honours it for AirDrop / Files / mail.
        type: 'image/x-adobe-dng',
        failOnCancel: false,
      });
    } catch (err) {
      console.error('Munsell DNG share failed:', err);
    } finally {
      setSharing(false);
    }
  }, [dngPath]);

  const shareWhiteMask = useCallback(() => {
    // Two possible sources: the ready-state export SVG (rendered when
    // kind === 'ready') and the failed-state one (rendered when kind
    // === 'failed'). Only one is mounted at any time.
    const svg =
      whiteMaskExportSvgRef.current ?? failedWhiteMaskExportSvgRef.current;
    if (!svg) return;
    setSharing(true);
    (
      svg as unknown as {
        toDataURL: (cb: (b64: string) => void, opts?: object) => void;
      }
    ).toDataURL(async (base64: string) => {
      try {
        const outPath = `${cacheDirectory}munsell-white-mask.png`;
        await writeAsStringAsync(outPath, base64, {
          encoding: EncodingType.Base64,
        });
        await Share.open({
          url: outPath.startsWith('file://') ? outPath : `file://${outPath}`,
          type: 'image/png',
          failOnCancel: false,
        });
      } catch (err) {
        console.error('Munsell white-mask share failed:', err);
      } finally {
        setSharing(false);
      }
    });
  }, []);

  return (
    <ScreenScaffold
      AppBar={<AppBar title={`Munsell ${page.name} validator`} />}>
      <SafeScrollView>
        <Column padding="md" space="md">
          {state.kind === 'analyzing' && (
            <Row alignItems="center" space="sm">
              <ActivityIndicator />
              <Text variant="body1">Analyzing chart…</Text>
            </Row>
          )}
          {state.kind === 'error' && (
            <Column space="sm">
              <Text variant="body1" bold>
                Analysis failed (unexpected exception)
              </Text>
              <Paragraph>{state.message}</Paragraph>
              <Row space="sm">
                <Box flex={1}>
                  <ContainedButton
                    label={sharing ? 'Sharing…' : 'Share DNG'}
                    onPress={shareDng}
                    disabled={sharing}
                    stretchToFit
                  />
                </Box>
                <Box flex={1}>
                  <ContainedButton
                    label="Back"
                    onPress={() => navigation.pop()}
                    stretchToFit
                  />
                </Box>
              </Row>
            </Column>
          )}
          {state.kind === 'failed' && (
            <FailedView
              debug={state.debug}
              sharing={sharing}
              onShareDng={shareDng}
              onShareWhiteMask={shareWhiteMask}
              whiteMaskExportSvgRef={failedWhiteMaskExportSvgRef}
              onBack={() => navigation.pop()}
            />
          )}
          {state.kind === 'ready' && (
            <>
              <Paragraph>
                Auto-registered chart, decoded{' '}
                {state.result.measurements.length} swatches. Reference:{' '}
                {referenceNotation ?? 'none (raw uncorrected)'}. Tap any cell to
                change reference.
              </Paragraph>
              {/* Test-swatch reference. Sampled from the DNG at the
                 bottom-right corner of the 7×6 chart grid (always
                 empty on any physical page). Compared against the
                 picked reference's expected colour in the last cell
                 of the result grid; tap the cell to also use it as
                 the WB reference for every other cell. */}
              <Select<string, false>
                nullable={false}
                options={availableRefs.map(r => r.id)}
                value={testRefId}
                onValueChange={setTestRefId}
                renderValue={id =>
                  availableRefs.find(r => r.id === id)?.name ?? id
                }
                label="Test-swatch reference"
              />
              <Row space="sm">
                <ViewToggleButton
                  label="Result grid"
                  selected={view === 'grid'}
                  onPress={() => setView('grid')}
                />
                <ViewToggleButton
                  label="Source + ROIs"
                  selected={view === 'source'}
                  onPress={() => setView('source')}
                />
              </Row>
              {view === 'grid' ? (
                <Box width="100%" aspectRatio={SVG_WIDTH / SVG_HEIGHT}>
                  <ResultSvg
                    ref={onScreenSvgRef}
                    cells={cells}
                    page={page}
                    referenceNotation={referenceNotation}
                    onCellPress={setReferenceNotation}
                    testRef={testRef}
                    testMeasuredLinearRgb={testMeasuredCorrected}
                    onTestSwatchPress={() =>
                      setReferenceNotation(TEST_SWATCH_REFERENCE_NOTATION)
                    }
                    testSwatchIsReference={
                      referenceNotation === TEST_SWATCH_REFERENCE_NOTATION
                    }
                  />
                </Box>
              ) : (
                <SourceOverlayView result={state.result} />
              )}
              <TestSwatchReverseMatch
                testRef={testRef}
                testMeasuredCorrected={testMeasuredCorrected}
                testSwatchIsReference={
                  referenceNotation === TEST_SWATCH_REFERENCE_NOTATION
                }
                wbReferenceLabel={referenceNotation}
              />
              <Row space="sm">
                <Box flex={1}>
                  <ContainedButton
                    label={useBradford ? 'Bradford: ON' : 'Bradford: OFF'}
                    onPress={() => setUseBradford(v => !v)}
                    stretchToFit
                  />
                </Box>
              </Row>
              <Row space="sm">
                <Box flex={1}>
                  <ContainedButton
                    label="Clear reference"
                    onPress={() => setReferenceNotation(null)}
                    disabled={referenceNotation === null}
                    stretchToFit
                  />
                </Box>
                <Box flex={1}>
                  <ContainedButton
                    label={sharing ? 'Sharing…' : 'Share as image'}
                    onPress={shareAsImage}
                    disabled={sharing}
                    stretchToFit
                  />
                </Box>
                <Box flex={1}>
                  <ContainedButton
                    label={sharing ? 'Sharing…' : 'Share as CSV'}
                    onPress={shareAsCsv}
                    disabled={sharing}
                    stretchToFit
                  />
                </Box>
              </Row>
              <Row space="sm">
                <Box flex={1}>
                  <ContainedButton
                    label={sharing ? 'Sharing…' : 'Share white mask (debug)'}
                    onPress={shareWhiteMask}
                    disabled={sharing}
                    stretchToFit
                  />
                </Box>
                <Box flex={1}>
                  <ContainedButton
                    label={sharing ? 'Sharing…' : 'Share DNG'}
                    onPress={shareDng}
                    disabled={sharing}
                    stretchToFit
                  />
                </Box>
              </Row>
              {/* Off-screen duplicate used only for high-res PNG export.
                 Positioned way off the visible area so RN still lays
                 it out (needed for toDataURL to render pixels), but
                 the user never sees it. */}
              <View style={styles.exportContainer} pointerEvents="none">
                <ResultSvg
                  ref={exportSvgRef}
                  cells={cells}
                  page={page}
                  referenceNotation={referenceNotation}
                  onCellPress={null}
                  testRef={testRef}
                  // WB-corrected measurement (same value the on-screen
                  // copy uses). Passing the RAW `testSwatchLinearRgb`
                  // here made the exported PNG show the uncorrected
                  // ΔE and skip the "test-swatch is reference → ΔE 0"
                  // update when the user tapped that cell.
                  testMeasuredLinearRgb={testMeasuredCorrected}
                  onTestSwatchPress={undefined}
                  testSwatchIsReference={
                    referenceNotation === TEST_SWATCH_REFERENCE_NOTATION
                  }
                />
              </View>
              {/* Off-screen white-mask export: preview image + blue
                 white-mask overlay at full preview resolution, so
                 toDataURL yields a bitmap the tester can zoom into
                 and actually read. */}
              <View
                style={[
                  styles.exportContainer,
                  {
                    width: state.result.preview.width,
                    height: state.result.preview.height,
                  },
                ]}
                pointerEvents="none">
                <Svg
                  ref={whiteMaskExportSvgRef}
                  width="100%"
                  height="100%"
                  viewBox={`0 0 ${state.result.preview.width} ${state.result.preview.height}`}
                  preserveAspectRatio="xMidYMid meet">
                  <SvgImage
                    href={state.result.preview.uri}
                    x={0}
                    y={0}
                    width={state.result.preview.width}
                    height={state.result.preview.height}
                    preserveAspectRatio="xMidYMid meet"
                  />
                  {/* Same layers the on-screen SourceOverlayView draws,
                     with the mask forced on. Gives the shared PNG the
                     full debug context (blobs, fitted grid, winning
                     triplet, sample rects) not just the mask alone. */}
                  <DebugOverlayLayers result={state.result} maskView="bright" />
                </Svg>
              </View>
            </>
          )}
        </Column>
      </SafeScrollView>
    </ScreenScaffold>
  );
};

// The full comparison grid, rendered as an SVG so it can be exported
// straight to a PNG via Svg.toDataURL. Layout mirrors the physical
// card: rows are Value (8/ at top, 2/ at bottom), columns are Chroma
// (/1 on left, /8 on right). Cells that don't exist on the physical
// card render as empty (light gray).
const ResultSvg = ({
  ref,
  cells,
  page,
  referenceNotation,
  onCellPress,
  testRef,
  testMeasuredLinearRgb,
  onTestSwatchPress,
  testSwatchIsReference,
}: {
  ref: React.RefObject<Svg | null>;
  cells: MunsellCellResult[];
  page: MunsellPage;
  referenceNotation: string | null;
  // Called with the tapped cell's Munsell notation. `null` disables
  // interactivity (used for the off-screen export copy).
  onCellPress: ((notation: string) => void) | null;
  // Test-swatch reference (Post-it, gray card, etc.) rendered in the
  // bottom-right corner cell — always empty on the physical chart, so
  // we repurpose it to compare a user-picked colour reference against
  // whatever the DNG shows at TEST_SWATCH_INDEX. Tapping the cell also
  // makes it the WB reference for every other cell (like tapping any
  // ordinary Munsell cell).
  testRef: AvailableReference | undefined;
  testMeasuredLinearRgb: {r: number; g: number; b: number} | null;
  onTestSwatchPress: (() => void) | undefined;
  testSwatchIsReference: boolean;
}) => {
  // Layout-driven axis labels. Standard: rows=value, cols=chroma
  // (with per-column hue subscript if the page has columnHues).
  // White: rows=(hue,chroma) pair, cols=value.
  const layout = page.layout ?? 'standard';
  const firstCol = page.firstChipCol ?? 0;
  const firstRow = page.firstChipRow ?? 0;
  const nRows = page.chipsPerRow.length;
  const nDataCols =
    layout === 'white' ? page.values.length : page.chromas.length;
  const rowLabelFor = (rowIdx: number): string => {
    if (layout === 'white') {
      const r = page.rowLabels?.[rowIdx];
      if (!r) return '';
      return r.chroma === 0 ? r.hue : `${r.hue} /${r.chroma}`;
    }
    const v = page.values[rowIdx];
    return v === undefined ? '' : `${v}`;
  };
  const colLabelFor = (dataCol: number): string => {
    if (layout === 'white') {
      const v = page.values[dataCol];
      return v === undefined ? '' : `${v}`;
    }
    const chroma = page.chromas[dataCol];
    const hue = page.columnHues?.[dataCol];
    // For mixed-hue standard pages (10Y-5GY, GLEY1, GLEY2) the plain
    // chroma alone doesn't identify a column — show hue too.
    return hue ? `${hue} /${chroma}` : `${chroma}`;
  };
  // Build a lookup so we can drop each cell into its grid position.
  // Key by PHYSICAL (rowIdx, colIdx) — cells carry physical coords
  // and mixed-hue pages have duplicate (value, chroma) pairs across
  // columns that would collide on a notation- or chroma-based key.
  const byKey = new Map<string, MunsellCellResult>();
  for (const c of cells) {
    byKey.set(`r${c.cell.rowIdx}c${c.cell.colIdx}`, c);
  }

  const elements: React.ReactNode[] = [];

  // Solid white background so the exported PNG isn't transparent —
  // otherwise Preview / Messages / etc render the file over whatever's
  // behind them (often dark), making everything unreadable.
  elements.push(
    <Rect
      key="bg"
      x={0}
      y={0}
      width={SVG_WIDTH}
      height={SVG_HEIGHT}
      fill="white"
    />,
  );

  // Legend band at the top explaining each part of a cell.
  elements.push(<Legend key="legend" />);

  // Column headers. Font shrinks a bit when the label carries a hue
  // prefix (mixed-hue standard, or WHITE values) — otherwise the
  // combined "10Y /2" style overflows the cell width.
  const colHeaderNeedsHue =
    layout === 'white' || !!page.columnHues || nDataCols < 6;
  const colHeaderFont = colHeaderNeedsHue
    ? Math.round(FONT_HEADER * 0.7)
    : FONT_HEADER;
  for (let dataCol = 0; dataCol < nDataCols; dataCol++) {
    const x = LABEL_W + CELL_W * dataCol + CELL_W / 2;
    elements.push(
      <SvgText
        key={`col-${dataCol}`}
        x={x}
        y={GRID_START_Y + HEADER_H - 14}
        fill="black"
        fontSize={colHeaderFont}
        fontWeight="bold"
        textAnchor="middle">
        {colLabelFor(dataCol)}
      </SvgText>,
    );
  }

  // Row headers + cells. Loop iterates in DATA-space (0..nRows-1);
  // the cell lookup uses `firstRow + dataRow` for the physical row
  // that matches what pageCells emits into cell.rowIdx.
  const rowHeaderFont =
    layout === 'white' ? Math.round(FONT_HEADER * 0.7) : FONT_HEADER;
  for (let dataRow = 0; dataRow < nRows; dataRow++) {
    const physicalRow = firstRow + dataRow;
    const y = GRID_START_Y + HEADER_H + CELL_H * dataRow;
    elements.push(
      <SvgText
        key={`row-${dataRow}`}
        x={LABEL_W - 14}
        y={y + CELL_H / 2 + rowHeaderFont / 3}
        fill="black"
        fontSize={rowHeaderFont}
        fontWeight="bold"
        textAnchor="end">
        {rowLabelFor(dataRow)}
      </SvgText>,
    );

    for (let dataCol = 0; dataCol < nDataCols; dataCol++) {
      const cx = LABEL_W + CELL_W * dataCol;
      const physicalCol = firstCol + dataCol;
      const key = `r${physicalRow}c${physicalCol}`;
      const cellResult = byKey.get(key);
      if (!cellResult) {
        // Grid slot with no swatch on the physical card. Render an
        // empty placeholder so the visual layout still lines up.
        elements.push(
          <Rect
            key={`empty-${key}`}
            x={cx + 2}
            y={y + 2}
            width={CELL_W - 4}
            height={CELL_H - 4}
            fill="#f0f0f0"
            stroke="#dddddd"
            strokeWidth={1}
          />,
        );
        continue;
      }
      elements.push(
        <ResultCell
          key={key}
          x={cx + 2}
          y={y + 2}
          w={CELL_W - 4}
          h={CELL_H - 4}
          cellResult={cellResult}
          isReference={cellResult.cell.notation === referenceNotation}
          onPress={
            onCellPress
              ? () => onCellPress(cellResult.cell.notation)
              : undefined
          }
        />,
      );
    }
  }

  // Ref-card cell in its own row below the main grid. Position on the
  // printed chart varies per page (page.refCardPoint on chartAnalysis
  // side; corner slot by default, offset for GLEY1/GLEY2), but the
  // display always sits at data row nRows, data col 0 — one uniform
  // slot regardless of layout, so mixed-hue and WHITE pages don't have
  // to reserve their own bottom-right corner for it.
  if (testRef && testMeasuredLinearRgb) {
    const refY = GRID_START_Y + HEADER_H + CELL_H * nRows;
    const refX = LABEL_W;
    elements.push(
      <SvgText
        key="ref-row-label"
        x={LABEL_W - 14}
        y={refY + CELL_H / 2 + rowHeaderFont / 3}
        fill="black"
        fontSize={rowHeaderFont}
        fontWeight="bold"
        textAnchor="end">
        REF
      </SvgText>,
    );
    elements.push(
      <TestSwatchCell
        key="test-swatch"
        x={refX + 2}
        y={refY + 2}
        w={CELL_W - 4}
        h={CELL_H - 4}
        testRef={testRef}
        measuredLinearRgb={testMeasuredLinearRgb}
        onPress={onTestSwatchPress}
        isReference={testSwatchIsReference}
      />,
    );
  }

  return (
    <Svg
      ref={ref}
      style={StyleSheet.absoluteFill}
      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet">
      {elements}
    </Svg>
  );
};

// A single cell: coloured background by ΔE, two colour swatches
// (expected left / measured right), Munsell notations, and ΔE. When
// `isReference` is true, adds a thick blue border to mark it as the
// active WB anchor. `onPress` is wired on both the background rect
// and swatches so tapping anywhere in the cell fires — react-native-svg
// dispatches onPress through Rect elements.
// (expected on the left half, measured on the right), and text with
// the two Munsell notations + the ΔE.
const ResultCell = ({
  x,
  y,
  w,
  h,
  cellResult,
  isReference,
  onPress,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  cellResult: MunsellCellResult;
  isReference: boolean;
  onPress?: () => void;
}) => {
  const bg = deltaEColor(cellResult.deltaE);
  const expHex = rgbToHex(cellResult.cell.expectedLinearRgb);
  const measHex = rgbToHex(cellResult.measuredLinearRgb);
  const swatchH = h * 0.35;
  const swatchW = (w - 6) / 2;
  const textY = y + swatchH + 10;
  return (
    <>
      <Rect x={x} y={y} width={w} height={h} fill={bg} onPress={onPress} />
      {/* Expected + measured swatches. */}
      <Rect
        x={x + 2}
        y={y + 2}
        width={swatchW}
        height={swatchH}
        fill={expHex}
        onPress={onPress}
      />
      <Rect
        x={x + 4 + swatchW}
        y={y + 2}
        width={swatchW}
        height={swatchH}
        fill={measHex}
        onPress={onPress}
      />
      {/* Notation + ΔE. */}
      <SvgText
        x={x + w / 2}
        y={textY + FONT_NOTATION}
        fill="black"
        fontSize={FONT_NOTATION}
        textAnchor="middle">
        {cellResult.cell.notation}
      </SvgText>
      <SvgText
        x={x + w / 2}
        y={textY + FONT_NOTATION * 2 + 4}
        fill="#444"
        fontSize={FONT_NOTATION}
        textAnchor="middle">
        {cellResult.measuredMunsell}
      </SvgText>
      <SvgText
        x={x + w / 2}
        y={textY + FONT_NOTATION * 2 + FONT_DELTAE + 10}
        fill="black"
        fontSize={FONT_DELTAE}
        fontWeight="bold"
        textAnchor="middle">
        ΔE {cellResult.deltaE.toFixed(1)}
      </SvgText>
      {/* Reference-cell marker: a thick blue outline on top of
         everything else. Non-interactive (onPress passes through
         the underlying rects). */}
      {isReference && (
        <Rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill="none"
          stroke="#1e88e5"
          strokeWidth={5}
        />
      )}
    </>
  );
};

// Test-swatch cell — same layout as ResultCell (expected swatch left,
// measured swatch right, ΔE bottom) but the identifier line shows the
// picked reference's name (Post-it yellow, gray card, …) instead of a
// Munsell notation. Rendered in the bottom-right corner of the result
// grid at the always-empty (row=last, col=last) position. Non-
// interactive here (picker is a Select above the grid); make it
// pressable later if a tap-to-open-picker UX is wanted.
const TestSwatchCell = ({
  x,
  y,
  w,
  h,
  testRef,
  measuredLinearRgb,
  onPress,
  isReference,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  testRef: AvailableReference;
  measuredLinearRgb: {r: number; g: number; b: number};
  onPress?: () => void;
  isReference: boolean;
}) => {
  // Simple ΔE computed on the fly — reuses the same linearRgb→XYZ→Lab
  // chain the chart cells use, kept inline so this cell stays self-
  // contained (no new export from chartAnalysis).
  const [eX, eY, eZ] = linearRgbToXyz(
    testRef.linearRgb.r,
    testRef.linearRgb.g,
    testRef.linearRgb.b,
  );
  const [mX, mY, mZ] = linearRgbToXyz(
    measuredLinearRgb.r,
    measuredLinearRgb.g,
    measuredLinearRgb.b,
  );
  const [eL, ea, eb] = xyzToLab(eX, eY, eZ);
  const [mL, ma, mb] = xyzToLab(mX, mY, mZ);
  const deltaE = DeltaE.getDeltaE00(
    {L: mL, A: ma, B: mb},
    {L: eL, A: ea, B: eb},
  );
  const bg = deltaEColor(deltaE);
  const expHex = rgbToHex(testRef.linearRgb);
  const measHex = rgbToHex(measuredLinearRgb);
  const swatchH = h * 0.35;
  const swatchW = (w - 6) / 2;
  const textY = y + swatchH + 10;
  // Wrap the reference name so long labels like
  // "3M Post-it Yellow (canary)" don't overflow the cell. Split on
  // " (" first (most builtins have "Name (details)" shape); fall back
  // to a rough word-count split for names without a paren. Anything
  // still wide gets a slightly smaller font.
  const nameLines = wrapRefName(testRef.name);
  const nameFontSize = Math.max(9, FONT_NOTATION - (nameLines.length - 1) * 3);
  return (
    <>
      <Rect x={x} y={y} width={w} height={h} fill={bg} onPress={onPress} />
      <Rect
        x={x + 2}
        y={y + 2}
        width={swatchW}
        height={swatchH}
        fill={expHex}
        onPress={onPress}
      />
      <Rect
        x={x + 4 + swatchW}
        y={y + 2}
        width={swatchW}
        height={swatchH}
        fill={measHex}
        onPress={onPress}
      />
      {nameLines.map((line, i) => (
        <SvgText
          key={`line-${i}`}
          x={x + w / 2}
          y={textY + nameFontSize * (i + 1) + i * 2}
          fill="black"
          fontSize={nameFontSize}
          textAnchor="middle">
          {line}
        </SvgText>
      ))}
      <SvgText
        x={x + w / 2}
        y={
          textY +
          nameFontSize * nameLines.length +
          (nameLines.length - 1) * 2 +
          FONT_DELTAE +
          10
        }
        fill="black"
        fontSize={FONT_DELTAE}
        fontWeight="bold"
        textAnchor="middle">
        ΔE {deltaE.toFixed(1)}
      </SvgText>
      {isReference && (
        <Rect
          x={x}
          y={y}
          width={w}
          height={h}
          fill="none"
          stroke="#1e88e5"
          strokeWidth={5}
        />
      )}
    </>
  );
};

// Break a reference name into 1-2 lines that fit inside a result-grid
// cell. Prefer splitting at " (" so "Name (extra)" wraps cleanly; else
// fall back to splitting roughly in half at the nearest space.
const wrapRefName = (name: string): string[] => {
  const parenIdx = name.indexOf(' (');
  if (parenIdx > 0) return [name.slice(0, parenIdx), name.slice(parenIdx + 1)];
  if (name.length <= 20) return [name];
  const mid = Math.floor(name.length / 2);
  // Find nearest space either side of mid.
  let split = -1;
  for (let off = 0; off < mid; off++) {
    if (name[mid - off] === ' ') {
      split = mid - off;
      break;
    }
    if (name[mid + off] === ' ') {
      split = mid + off;
      break;
    }
  }
  if (split < 0) return [name];
  return [name.slice(0, split), name.slice(split + 1)];
};

// "Did the auto-registration land on the right pixels?" view — shows
// the DNG preview with the per-swatch sample rectangles (red) and the
// centroids the grid detector actually found (green dots) overlaid.
// If the reds are shifted off the swatches, registration is off. If
// most cells have a corresponding green dot inside them, we found
// most swatches directly; if not, most cells were extrapolated from
// what few we did find.
// Colour code for the raw-blob debug rectangles. Chosen so kept
// blobs disappear into the (existing) green dots while each rejection
// reason is easy to eyeball on a busy overlay.
const RAW_BLOB_STROKE: Record<string, string> = {
  kept: 'rgba(34,204,34,0.9)', // green — RANSAC input (chip-hole circles)
  reject_area_low: 'rgba(180,180,180,0.6)', // grey — smaller than min hole
  reject_area_high: 'rgba(0,120,255,0.9)', // blue — bigger than max hole
  reject_touches_edge: 'rgba(255,255,0,0.6)', // yellow — bbox at image edge
  reject_outside_guide: 'rgba(220,40,220,0.9)', // magenta — centre outside chart-guide rect
  reject_brightness: 'rgba(150,100,50,0.7)', // brown — centre pixel wrong side of paper/avg midpoint
};

// Statuses hidden from the legend and from the raw-blob overlay.
// Empty during dark-background tuning so every classified blob shows
// up in its status colour and the tester can see WHY chip holes went
// missing. Add entries back if a status becomes noise once tuning is
// stable.
const HIDDEN_STATUSES = new Set<string>();

// Display label for statuses that read more clearly with a short
// alias in the legend below the source view.
const STATUS_LABEL: Record<string, string> = {
  kept: 'detected',
};

// Shared debug-overlay layers rendered on top of the preview image
// (mask + classified blobs + fitted grid + winning triplet + sample
// rects). Used by both the on-screen source view (with a togglable
// mask) and the off-screen white-mask export (mask always on) so the
// shared PNG carries the same context testers see in-app.
const DebugOverlayLayers = ({
  result,
  maskView,
}: {
  result: MunsellChartResult;
  maskView: 'none' | 'bright' | 'body';
  // `page` was needed when this component filtered SAMPLE_GRID entries
  // by page.chipsPerRow; that filter is gone now that chartAnalysis
  // feeds detectChartByRegions a per-page sample grid. Keep the
  // parameter list flat rather than reintroducing the page.
}) => {
  const {preview, previewRects, refCardRect, detectedSwatches, grid} = result;
  // Where the camera-view chart-guide rectangle WAS at capture time,
  // in preview-image coordinates. Same math as ChartGuideOverlay, so
  // this is exactly the rectangle the user was framing the chart into
  // (assuming they captured with the app; for loaded photos it's the
  // hypothetical guide at the same fractions inside the loaded image).
  const guideRect = computeChartGuideRect(preview.width, preview.height);
  return (
    <>
      {/* Mask overlay (opaque blue for the bright mask so the tester
         can see exactly which pixels the mask includes; magenta for
         the chart body mask). Toggled below so we can see one at a
         time without them stacking into mush. */}
      {maskView === 'bright' &&
        grid.brightMaskSpans.map((s, i) => (
          <Rect
            key={`bm-${i}`}
            x={s.x}
            y={s.y}
            width={s.w}
            height={s.h}
            fill="rgb(0,180,255)"
          />
        ))}
      {maskView === 'body' &&
        grid.chartBodyMaskSpans.map((s, i) => (
          <Rect
            key={`cbm-${i}`}
            x={s.x}
            y={s.y}
            width={s.w}
            height={s.h}
            fill="rgba(255,0,255,0.35)"
          />
        ))}
      {/* Where the viewfinder chart-guide rectangle sat at capture
         time. Lets a tester see how well they framed the chart
         inside the guide — a chart that landed well inside the
         rectangle vs. one that crept toward an edge is useful info
         for tuning the ROI heuristics or filtering out spurious
         circles that fell outside the guide. Yellow dashed to
         distinguish from the solid green rings (detected holes) and
         the yellow ring (matched-ref grid). */}
      <Rect
        x={guideRect.x}
        y={guideRect.y}
        width={guideRect.w}
        height={guideRect.h}
        stroke="#ffeb3b"
        strokeWidth={2}
        strokeDasharray="8,6"
        fill="none"
      />
      {/* WhiteMask border-calibration sample area — the annulus is
         filled with a white diagonal hash so it reads as an AREA (not
         two boundary lines). Every hashed pixel is being fed to the
         paper-anchor median. Inner boundary = guide + innerBuf; outer
         boundary = frame - outerMargin. When these two boundaries
         cross each other on some edge (usually top/bottom when the
         guide is tall), the ring collapses to zero pixels on that
         edge and only the other edges contribute. Use to eyeball
         whether tape / Post-Its / stray objects are inside the sample
         region. */}
      {(() => {
        const shortDim = Math.min(preview.width, preview.height);
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
        const outerW = preview.width - 2 * outerMargin;
        const outerH = preview.height - 2 * outerMargin;
        // Two-subpath Path with evenodd fill = the outer rect minus
        // the inner rect. Filled with a repeating diagonal-line pattern
        // sized in the same user-space as the preview coords (so lines
        // stay visually consistent across zoom levels).
        const annulusPath =
          `M${outerX},${outerY} h${outerW} v${outerH} h${-outerW} Z ` +
          `M${innerX},${innerY} h${innerW} v${innerH} h${-innerW} Z`;
        return (
          <>
            <Defs>
              {/* Diagonal hash pattern. Drawn as an EXPLICIT slanted
                 line rather than a vertical line + patternTransform=
                 "rotate(45)" — react-native-svg's Pattern silently
                 ignores patternTransform on iOS, and the tile rendered
                 as vertical stubs that looked like tiny dots. Three
                 overlapping segments make the diagonal continuous
                 across tile edges (main line + two edge-fill lines
                 that carry the diagonal past the tile corners). */}
              <Pattern
                id="whitemaskHash"
                patternUnits="userSpaceOnUse"
                width={16}
                height={16}>
                <Line
                  x1={0}
                  y1={16}
                  x2={16}
                  y2={0}
                  stroke="white"
                  strokeWidth={3}
                />
                <Line
                  x1={-4}
                  y1={4}
                  x2={4}
                  y2={-4}
                  stroke="white"
                  strokeWidth={3}
                />
                <Line
                  x1={12}
                  y1={20}
                  x2={20}
                  y2={12}
                  stroke="white"
                  strokeWidth={3}
                />
              </Pattern>
            </Defs>
            <Path
              d={annulusPath}
              fill="url(#whitemaskHash)"
              fillRule="evenodd"
            />
          </>
        );
      })()}
      {/* Chart body bounding box in cyan — the region hole detection
         was restricted to. If this outline doesn't match the actual
         chart, the chart-body detector is at fault (wrong bandpass
         thresholds, or a similarly-grey object in the frame). */}
      {grid.chartBodyBounds && (
        <Rect
          key="chart-body"
          x={grid.chartBodyBounds.minX}
          y={grid.chartBodyBounds.minY}
          width={grid.chartBodyBounds.maxX - grid.chartBodyBounds.minX + 1}
          height={grid.chartBodyBounds.maxY - grid.chartBodyBounds.minY + 1}
          stroke="cyan"
          strokeWidth={2}
          fill="none"
        />
      )}
      {/* Raw regions, colour-coded by classifier outcome. Hidden
         statuses drop out entirely — they don't feed the RANSAC
         match. The RANSAC-input circles (kept_bright) render as a
         green ring at the DETECTED radius (so we can see if the
         circle-finder picked a plausible-sized region) plus a small
         filled green centre dot for easy counting; other rejects
         render as bounding-box outlines. */}
      {grid.rawBlobs.map((b, i) => {
        if (HIDDEN_STATUSES.has(b.status)) return null;
        if (b.status === 'kept') {
          // Back out the inscribed radius from the bbox — findFlatCircles
          // stored the circle's inscribing square as minX/minY/maxX/maxY.
          // Just the outer green ring here — the centre dot is drawn
          // AFTER the yellow ring pass below, so it stays visible on
          // top of any matched-inlier yellow fill.
          const r = (b.maxX - b.minX) / 2;
          return (
            <Circle
              key={`raw-${i}`}
              cx={b.cx}
              cy={b.cy}
              r={r}
              stroke="#22cc22"
              strokeWidth={2}
              fill="none"
            />
          );
        }
        return (
          <Rect
            key={`raw-${i}`}
            x={b.minX}
            y={b.minY}
            width={b.maxX - b.minX + 1}
            height={b.maxY - b.minY + 1}
            stroke={RAW_BLOB_STROKE[b.status] ?? 'white'}
            strokeWidth={1}
            fill="none"
          />
        );
      })}
      {/* Fitted-grid intersections in yellow. Draw all page-specific
         ref-grid points after the winning RANSAC transform. Matched
         ones (inliers within matchThreshold of a detected point) get
         FILLED yellow so testers can see which ref points actually
         contributed to the score; unmatched ones stay hollow.
         Radius 14 so they're visible on small phone screens.
         DELIBERATELY no `grid.centers` fallback anymore — when
         RANSAC didn't produce a matchedGrid, the fallback used to
         draw a scatter of 42 tiny yellow squares that was confusing
         (looked like extra ref points). Showing nothing in the
         RANSAC-failed case is clearer: the absence of the 12 rings
         is itself the signal that registration failed. */}
      {grid.matchedGrid?.map((p, i) => (
        <Circle
          key={`mg-${i}`}
          cx={p.x}
          cy={p.y}
          r={14}
          stroke="#ffcc00"
          strokeWidth={3}
          fill={grid.matchedGridInliers?.[i] ? '#ffcc00' : 'none'}
        />
      ))}
      {/* Green centre dots for kept_bright detections, drawn AFTER
         the yellow rings so they sit visibly on top of any inlier
         fill. Paired with the outer green rings drawn in the raw-
         blobs pass above. */}
      {grid.rawBlobs.map((b, i) => {
        if (b.status !== 'kept') return null;
        return (
          <Rect
            key={`raw-dot-${i}`}
            x={b.cx - 3}
            y={b.cy - 3}
            width={6}
            height={6}
            fill="#22cc22"
          />
        );
      })}
      {/* The 3 detected points that formed the winning triplet.
         Bright red rings so a tester can see exactly which 3 anchors
         the whole transform was built from. */}
      {grid.matchedTripletDetected?.map((p, i) => (
        <Circle
          key={`tri-${i}`}
          cx={p.x}
          cy={p.y}
          r={22}
          stroke="#ff2020"
          strokeWidth={3}
          fill="none"
        />
      ))}
      {/* Sample ROIs — one red square per real cell, drawn at the
         pixel regions the analyzer ACTUALLY samples (chartAnalysis
         builds previewRects from grid.centers[cell.rowIdx][cell.colIdx]).
         Previously used grid.matchedSampleRects (RANSAC-derived), but
         that can drift by a row on pages with a very symmetric
         ref-grid (e.g. 10Y-5GY's 3×4 hole grid — multiple locally-
         optimal RANSAC fits, and it picks the wrong one), giving a
         debug view that doesn't match what's actually being measured.
         previewRects reflects the real sample positions. */}
      {previewRects.map((r, i) => (
        <Rect
          key={`sample-${i}`}
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          stroke="#ff2020"
          strokeWidth={2}
          fill="none"
        />
      ))}
      {/* Ref-card sample rect — same red as the chip rects since it's
         the same kind of "here's what we sampled" annotation, just at
         the extra per-page ref position (may sit outside the chip
         grid on fully-populated pages like GLEY1/GLEY2). */}
      {refCardRect && (
        <Rect
          key="sample-ref"
          x={refCardRect.x}
          y={refCardRect.y}
          width={refCardRect.w}
          height={refCardRect.h}
          stroke="#ff2020"
          strokeWidth={2}
          fill="none"
        />
      )}
      {/* Filled green dots — swatch centroids from the OLD cluster
         fit. Hidden when the RANSAC match ran. */}
      {!grid.matchedGrid &&
        detectedSwatches.map((d, i) => (
          <Rect
            key={`det-${i}`}
            x={d.cx - 4}
            y={d.cy - 4}
            width={8}
            height={8}
            fill="#22cc22"
          />
        ))}
    </>
  );
};

// Dev-only failure view — shown when analyzeMunsellChart returned
// {kind: 'failure', debug} (typically because detectChartByRegions
// couldn't find enough candidates or couldn't fit a plausible grid).
// Renders the preview PNG if we have one and dumps the structured
// debug info a dev can act on: failure reason, white-mask luma
// threshold values, and per-status blob counts. Share buttons cover
// the DNG (always available) so the shot can be inspected off-device.
const FailedView = ({
  debug,
  sharing,
  onShareDng,
  onShareWhiteMask,
  whiteMaskExportSvgRef,
  onBack,
}: {
  debug: MunsellChartFailureDebug;
  sharing: boolean;
  onShareDng: () => void;
  // Parent owns the toDataURL/Share flow (needs setSharing) and hands
  // us a callback + the export SVG ref to render into. The off-screen
  // SVG is mounted below the on-screen one at preview-pixel size so
  // the shared PNG is full-resolution.
  onShareWhiteMask: () => void;
  whiteMaskExportSvgRef: React.RefObject<Svg | null>;
  onBack: () => void;
}) => {
  const preview = debug.preview;
  const aspect = preview ? preview.width / preview.height : 4 / 3;
  // Synthetic MunsellChartResult shape for DebugOverlayLayers — only
  // .grid and .preview are actually read on the failure path (the
  // rest of the layers gracefully render nothing when grid.matchedGrid
  // etc. are null).
  const syntheticResult = preview
    ? ({
        grid: debug.grid,
        preview,
        previewRects: [],
        refCardRect: null,
        detectedSwatches: [],
        measurements: [],
        matchedSampleValues: null,
        testSwatchLinearRgb: null,
      } as unknown as MunsellChartResult)
    : null;
  return (
    <Column space="sm">
      <Text variant="body1" bold>
        Analysis failed
      </Text>
      <Paragraph>{debug.reason}</Paragraph>
      <Text variant="body2">
        {`whiteMask: lumaAnchor=${debug.lumaAnchor ?? 'n/a'}, `}
        {`lumaCutoff=${debug.lumaCutoff ?? 'n/a'}, `}
        {`spans=${debug.grid.brightMaskSpans.length}`}
      </Text>
      <Text variant="body2">
        {`rawBlobs=${debug.grid.rawBlobs.length}, `}
        {`detected=${debug.grid.detected.length}, `}
        {`cellW=${debug.grid.cellW.toFixed(1)}, ` +
          `cellH=${debug.grid.cellH.toFixed(1)}`}
      </Text>
      {preview && syntheticResult && (
        <Box width="100%" aspectRatio={aspect} backgroundColor="grey.900">
          <Image
            source={{uri: preview.uri}}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
          />
          <Svg
            style={StyleSheet.absoluteFill}
            viewBox={`0 0 ${preview.width} ${preview.height}`}
            preserveAspectRatio="xMidYMid meet">
            {/* Same layers as the success-state "source + ROIs"
               overlay, with the mask forced on. The synthetic
               MunsellChartResult only populates .grid + .preview —
               all detected / matched / triplet layers render nothing
               because their source fields are empty / null. */}
            <DebugOverlayLayers result={syntheticResult} maskView="bright" />
          </Svg>
        </Box>
      )}
      <Row space="sm">
        <Box flex={1}>
          <ContainedButton
            label={sharing ? 'Sharing…' : 'Share DNG'}
            onPress={onShareDng}
            disabled={sharing}
            stretchToFit
          />
        </Box>
        <Box flex={1}>
          <ContainedButton
            label={sharing ? 'Sharing…' : 'Share white mask'}
            onPress={onShareWhiteMask}
            disabled={sharing || !preview}
            stretchToFit
          />
        </Box>
        <Box flex={1}>
          <ContainedButton label="Back" onPress={onBack} stretchToFit />
        </Box>
      </Row>
      {/* Off-screen export SVG mirroring the on-screen overlay at
         preview-pixel size — toDataURL renders from THIS one so the
         shared PNG is high-DPI-crisp instead of screen-sized. */}
      {preview && syntheticResult && (
        <View
          style={[
            styles.exportContainer,
            {width: preview.width, height: preview.height},
          ]}
          pointerEvents="none">
          <Svg
            ref={whiteMaskExportSvgRef}
            width="100%"
            height="100%"
            viewBox={`0 0 ${preview.width} ${preview.height}`}
            preserveAspectRatio="xMidYMid meet">
            <SvgImage
              href={preview.uri}
              x={0}
              y={0}
              width={preview.width}
              height={preview.height}
              preserveAspectRatio="xMidYMid meet"
            />
            <DebugOverlayLayers result={syntheticResult} maskView="bright" />
          </Svg>
        </View>
      )}
    </Column>
  );
};

// Empirical linear-sRGB of the test-swatch cell, computed as
// applyWbCorrection(rawMeasurement, chosenWbRef). This is what the
// physical swatch REALLY looks like once we correct for the capture's
// illuminant using the picked Munsell cell — copy the value into
// getColorFromLinearRgb.ts LINEAR_REFERENCES to define / refine a
// reference from this measurement.
//
// Hidden when the test swatch itself is the WB reference — under that
// choice the correction is derived FROM the swatch to make it match
// the picked expected exactly, so the number is trivially the picked
// expected and tells you nothing new.
const TestSwatchReverseMatch = ({
  testRef,
  testMeasuredCorrected,
  testSwatchIsReference,
  wbReferenceLabel,
}: {
  testRef: AvailableReference | undefined;
  testMeasuredCorrected: {r: number; g: number; b: number} | null;
  testSwatchIsReference: boolean;
  // Notation of the WB reference cell (e.g. "10YR 5/4"), or null if
  // no WB reference is picked (uncorrected raw measurement).
  wbReferenceLabel: string | null;
}) => {
  if (testSwatchIsReference) return null;
  if (!testMeasuredCorrected || !testRef) return null;
  const {r, g, b} = testMeasuredCorrected;
  const rgbLine = `r: ${r.toFixed(4)}, g: ${g.toFixed(4)}, b: ${b.toFixed(4)}`;
  const wbSource = wbReferenceLabel ?? '(no WB — raw measurement)';
  return (
    <Box style={styles.reverseMatchBox}>
      <Text variant="body1" bold>
        Test-swatch reverse match (linear-sRGB)
      </Text>
      <Text variant="caption">
        Under WB ref {wbSource}, the physical "{testRef.name}" measures:
      </Text>
      <Text variant="body1" style={styles.monoText}>
        {rgbLine}
      </Text>
      <Text variant="caption">
        Paste into LINEAR_REFERENCES in src/model/color/getColorFromLinearRgb.ts
        to define a new / refined reference from this measurement.
      </Text>
    </Box>
  );
};

const SourceOverlayView = ({result}: {result: MunsellChartResult}) => {
  const {preview} = result;
  const aspect = preview.width / preview.height;
  const [maskView, setMaskView] = useState<'none' | 'bright' | 'body'>('none');
  return (
    <Box width="100%" aspectRatio={aspect} backgroundColor="grey.900">
      <Image
        source={{uri: preview.uri}}
        style={StyleSheet.absoluteFill}
        resizeMode="contain"
      />
      <Svg
        style={StyleSheet.absoluteFill}
        viewBox={`0 0 ${preview.width} ${preview.height}`}
        preserveAspectRatio="xMidYMid meet">
        <DebugOverlayLayers result={result} maskView={maskView} />
      </Svg>
      <RawBlobLegend
        rawBlobs={result.grid.rawBlobs}
        matchedScore={result.grid.matchedScore}
        matchedRefCount={result.grid.matchedRefCount}
        matchedInlierCount={
          result.grid.matchedGridInliers
            ? result.grid.matchedGridInliers.filter(Boolean).length
            : null
        }
      />
      <MaskToggle value={maskView} onChange={setMaskView} />
    </Box>
  );
};

// Toggle for the mask overlays. Sits in the top-right of the source
// view. Buttons are big enough to hit reliably on-device but small
// enough not to obscure the chart.
const MaskToggle = ({
  value,
  onChange,
}: {
  value: 'none' | 'bright' | 'body';
  onChange: (v: 'none' | 'bright' | 'body') => void;
}) => {
  const btn = (label: string, v: 'none' | 'bright' | 'body', color: string) => (
    <RNText
      key={v}
      style={[styles.maskToggleBtn, value === v && {backgroundColor: color}]}
      onPress={() => onChange(v)}>
      {label}
    </RNText>
  );
  return (
    <View style={styles.maskToggleContainer}>
      {btn('none', 'none', 'rgba(120,120,120,0.9)')}
      {btn('white', 'bright', 'rgba(255,255,255,0.9)')}
      {btn('body', 'body', 'rgba(255,0,255,0.9)')}
    </View>
  );
};

// Small legend rendered over the top-left of the source overlay: one
// line per rejection reason with a count, so you can see at a glance
// "22 blobs rejected as too big" without having to eyeball colours.
const RawBlobLegend = ({
  rawBlobs,
  matchedScore,
  matchedRefCount,
  matchedInlierCount,
}: {
  rawBlobs: MunsellChartResult['grid']['rawBlobs'];
  matchedScore: number | null;
  // Number of ref-grid points the RANSAC ran against (per-page — 30
  // for 10YR, 35 for the universal MAX fallback). Denominator for the
  // score/inlier display.
  matchedRefCount: number | null;
  // How many ref points landed inside matchThreshold under the winning
  // transform (i.e. contributed a +1 to score).
  matchedInlierCount: number | null;
}) => {
  const counts: Record<string, number> = {};
  for (const b of rawBlobs) counts[b.status] = (counts[b.status] ?? 0) + 1;
  const entries = Object.entries(counts)
    .filter(([status]) => !HIDDEN_STATUSES.has(status))
    .sort(([, a], [, b]) => b - a);
  return (
    <View style={styles.legendContainer} pointerEvents="none">
      {matchedScore != null && matchedRefCount != null && (
        <RNText style={styles.legendLine}>
          <RNText style={styles.legendMatchDot}>■</RNText>
          {`  match: ${matchedScore.toFixed(1)} / ${(matchedRefCount * 1.1).toFixed(1)}` +
            (matchedInlierCount != null
              ? ` (${matchedInlierCount}/${matchedRefCount} refs)`
              : ` (${matchedRefCount} refs)`)}
        </RNText>
      )}
      {entries.map(([status, n]) => (
        <RNText key={status} style={styles.legendLine}>
          <RNText style={{color: RAW_BLOB_STROKE[status] ?? 'white'}}>■</RNText>
          {`  ${STATUS_LABEL[status] ?? status}: ${n}`}
        </RNText>
      ))}
    </View>
  );
};

// Two-option toggle above the result view. Matches the existing
// experimental capture-mode selector's chip style.
const ViewToggleButton = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <Box flex={1}>
    <ContainedButton
      label={label}
      onPress={onPress}
      disabled={selected}
      stretchToFit={true}
    />
  </Box>
);

// Legend band at the top of the chart image. Left: a sample cell
// showing what the swatches / text / heatmap look like. Right: a
// numbered explanation of each element.
const Legend = () => {
  const sampleX = LABEL_W;
  const sampleY = 30;
  const sampleW = CELL_W;
  const sampleH = CELL_H;
  // Fake data for the demo cell — chosen to produce visibly distinct
  // expected + measured swatches so the "left vs right" contrast is
  // obvious at a glance.
  const demoExpected = {r: 0.42, g: 0.34, b: 0.2};
  const demoMeasured = {r: 0.5, g: 0.38, b: 0.22};
  const demoDeltaE = 4.2;
  const demoNotation = '10YR 5/4';
  const demoMeasured_ = '10YR 5/3';

  const textX = sampleX + sampleW + 30;
  const lineH = 32;
  const textStartY = sampleY + 20;

  return (
    <>
      {/* Title bar */}
      <SvgText
        x={SVG_WIDTH / 2}
        y={22}
        fill="black"
        fontSize={22}
        fontWeight="bold"
        textAnchor="middle">
        Munsell chart validation — how to read each cell
      </SvgText>

      {/* Sample cell */}
      <Rect
        x={sampleX}
        y={sampleY}
        width={sampleW}
        height={sampleH}
        fill={deltaEColor(demoDeltaE)}
      />
      <Rect
        x={sampleX + 2}
        y={sampleY + 2}
        width={(sampleW - 6) / 2}
        height={sampleH * 0.35}
        fill={rgbToHex(demoExpected)}
      />
      <Rect
        x={sampleX + 4 + (sampleW - 6) / 2}
        y={sampleY + 2}
        width={(sampleW - 6) / 2}
        height={sampleH * 0.35}
        fill={rgbToHex(demoMeasured)}
      />
      <SvgText
        x={sampleX + sampleW / 2}
        y={sampleY + sampleH * 0.35 + 10 + FONT_NOTATION}
        fill="black"
        fontSize={FONT_NOTATION}
        textAnchor="middle">
        {demoNotation}
      </SvgText>
      <SvgText
        x={sampleX + sampleW / 2}
        y={sampleY + sampleH * 0.35 + 10 + FONT_NOTATION * 2 + 4}
        fill="#444"
        fontSize={FONT_NOTATION}
        textAnchor="middle">
        {demoMeasured_}
      </SvgText>
      <SvgText
        x={sampleX + sampleW / 2}
        y={sampleY + sampleH * 0.35 + 10 + FONT_NOTATION * 2 + FONT_DELTAE + 10}
        fill="black"
        fontSize={FONT_DELTAE}
        fontWeight="bold"
        textAnchor="middle">
        ΔE {demoDeltaE.toFixed(1)}
      </SvgText>

      {/* Right-side explanation lines. */}
      <SvgText
        x={textX}
        y={textStartY}
        fill="black"
        fontSize={20}
        fontWeight="bold">
        Each cell shows:
      </SvgText>
      <SvgText x={textX} y={textStartY + lineH} fill="black" fontSize={18}>
        • Left swatch: expected colour (Munsell reference)
      </SvgText>
      <SvgText x={textX} y={textStartY + lineH * 2} fill="black" fontSize={18}>
        • Right swatch: measured colour (from your DNG)
      </SvgText>
      <SvgText x={textX} y={textStartY + lineH * 3} fill="black" fontSize={18}>
        • Line 1: expected Munsell notation
      </SvgText>
      <SvgText x={textX} y={textStartY + lineH * 4} fill="black" fontSize={18}>
        • Line 2: measured Munsell notation
      </SvgText>
      <SvgText x={textX} y={textStartY + lineH * 5} fill="black" fontSize={18}>
        • ΔE (CIE ΔE2000): 0 = perfect, ≥ 12 = clearly off
      </SvgText>
      <SvgText x={textX} y={textStartY + lineH * 6} fill="black" fontSize={18}>
        • Cell background: ΔE bucket
      </SvgText>

      {/* Colour-swatch key for the ΔE buckets. */}
      <LegendBucket
        x={textX}
        y={textStartY + lineH * 6 + 14}
        deltaE={1}
        label="≤3"
      />
      <LegendBucket
        x={textX + 90}
        y={textStartY + lineH * 6 + 14}
        deltaE={5}
        label="≤6"
      />
      <LegendBucket
        x={textX + 180}
        y={textStartY + lineH * 6 + 14}
        deltaE={10}
        label="≤12"
      />
      <LegendBucket
        x={textX + 270}
        y={textStartY + lineH * 6 + 14}
        deltaE={20}
        label=">12"
      />

      {/* Divider between legend and grid. */}
      <Rect
        x={0}
        y={LEGEND_H - 4}
        width={SVG_WIDTH}
        height={2}
        fill="#cccccc"
      />
    </>
  );
};

const LegendBucket = ({
  x,
  y,
  deltaE,
  label,
}: {
  x: number;
  y: number;
  deltaE: number;
  label: string;
}) => (
  <>
    <Rect x={x} y={y} width={26} height={20} fill={deltaEColor(deltaE)} />
    <SvgText x={x + 32} y={y + 15} fill="black" fontSize={16}>
      {label}
    </SvgText>
  </>
);

const styles = StyleSheet.create({
  exportContainer: {
    position: 'absolute',
    // Way off the visible area — RN still lays this out so
    // toDataURL has real pixels to render, but the user never sees it.
    left: -100000,
    top: 0,
    width: EXPORT_CSS_WIDTH,
    height: EXPORT_CSS_HEIGHT,
  },
  legendContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  legendLine: {
    color: 'white',
    fontSize: 11,
    lineHeight: 14,
  },
  legendMatchDot: {
    color: '#ffcc00',
  },
  monoText: {
    fontFamily: 'Courier',
  },
  reverseMatchBox: {
    padding: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#c5c5c5',
    backgroundColor: '#f5f5f5',
  },
  maskToggleContainer: {
    position: 'absolute',
    top: 4,
    right: 4,
    flexDirection: 'row',
    gap: 4,
  },
  maskToggleBtn: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    overflow: 'hidden',
    borderRadius: 4,
  },
});
