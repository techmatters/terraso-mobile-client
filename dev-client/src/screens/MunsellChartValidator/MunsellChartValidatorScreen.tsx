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

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  Rect,
  Image as SvgImage,
  Text as SvgText,
} from 'react-native-svg';

import {
  cacheDirectory,
  EncodingType,
  writeAsStringAsync,
} from 'expo-file-system/legacy';

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
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {
  analyzeMunsellChart,
  computeCellResults,
  csvFromCells,
  DEFAULT_REFERENCE_NOTATION,
  type MunsellCellResult,
  type MunsellChartFailureDebug,
  type MunsellChartResult,
} from 'terraso-mobile-client/screens/MunsellChartValidator/chartAnalysis';
import {REFERENCE_GRID} from 'terraso-mobile-client/screens/MunsellChartValidator/matchAlgorithm';
import {
  CHART_CHROMAS,
  CHART_HUE,
  CHART_VALUES,
} from 'terraso-mobile-client/screens/MunsellChartValidator/munsellChart10YR';
import {
  findMunsellPage,
  MUNSELL_PAGES,
  type MunsellPage,
} from 'terraso-mobile-client/screens/MunsellChartValidator/munsellPages';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';

// Dev tool: point at a captured DNG of the 10YR Munsell soil-colour
// card, auto-register the chart in the image, decode all ~32 swatches,
// compare each measured colour to its published Munsell notation, and
// render a comparison grid the tester can share.
//
// Nav route: MUNSELL_CHART_VALIDATOR, param `dngPath` (file:// URI
// from a fresh RAW capture).

export type MunsellChartValidatorProps = {
  dngPath: string;
};

// SVG layout (fixed-pixel viewBox — easier to reason about text sizing
// than a fractional viewBox). The `EXPORT_SCALE` multiplier below then
// renders the whole thing at 4× when saving to PNG for share, so the
// exported image is high-DPI-crisp regardless of what the viewBox is
// sized at.
const SVG_WIDTH = 800;
const HEADER_H = 50;
const LABEL_W = 70;
const CELL_W = (SVG_WIDTH - LABEL_W) / CHART_CHROMAS.length;
const CELL_H = 130;
// Legend band above the grid. Explains what the two swatches, the
// two Munsell notations, and the background heatmap mean.
const LEGEND_H = 260;
const GRID_START_Y = LEGEND_H;
const SVG_HEIGHT = LEGEND_H + HEADER_H + CELL_H * CHART_VALUES.length + 40;

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
  // Which Munsell page the user says this DNG is of. Changing this
  // re-runs analyzeMunsellChart with the new page's cell layout
  // (chip positions differ across hues) so sampling picks up the
  // right ROIs on the right holes. Default to the first configured
  // page (10YR).
  const [pageHue, setPageHue] = useState<string>(MUNSELL_PAGES[0].hue);
  const page = useMemo(() => findMunsellPage(pageHue), [pageHue]);
  const cells = useMemo(
    () =>
      state.kind === 'ready'
        ? computeCellResults(
            state.result.measurements,
            referenceNotation,
            useBradford,
          )
        : [],
    [state, referenceNotation, useBradford],
  );

  useEffect(() => {
    // Re-run when the selected page changes — analyzeMunsellChart uses
    // page.cells to build the per-cell sample rects, so a page swap
    // resamples the DNG at the right chip positions.
    setState({kind: 'analyzing'});
    (async () => {
      try {
        const outcome = await analyzeMunsellChart(dngPath, page);
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
  }, [dngPath, page]);

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
    const svg = whiteMaskExportSvgRef.current;
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
      AppBar={<AppBar title={`Munsell ${page.hue} validator`} />}>
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
              {/* Munsell hue-page selector. Changing this re-runs the
                 analyzer with the picked page's (value, chroma) layout —
                 sample rects follow the page's chip positions, expected
                 notations follow its (hue, value, chroma) triples. */}
              <Select<string, false>
                nullable={false}
                options={MUNSELL_PAGES.map(p => p.hue)}
                value={pageHue}
                onValueChange={setPageHue}
                renderValue={hue => `Munsell ${hue} page`}
                label="Chart page"
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
                  />
                </Box>
              ) : (
                <SourceOverlayView result={state.result} />
              )}
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
                  <DebugOverlayLayers
                    result={state.result}
                    maskView="bright"
                  />
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
}: {
  ref: React.RefObject<Svg | null>;
  cells: MunsellCellResult[];
  page: MunsellPage;
  referenceNotation: string | null;
  // Called with the tapped cell's Munsell notation. `null` disables
  // interactivity (used for the off-screen export copy).
  onCellPress: ((notation: string) => void) | null;
}) => {
  // Build a lookup so we can drop each cell into its grid position.
  const byKey = new Map<string, MunsellCellResult>();
  for (const c of cells) {
    byKey.set(`${c.cell.value}/${c.cell.chroma}`, c);
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

  // Column headers.
  page.chromas.forEach((chroma, colIdx) => {
    const x = LABEL_W + CELL_W * colIdx + CELL_W / 2;
    elements.push(
      <SvgText
        key={`col-${chroma}`}
        x={x}
        y={GRID_START_Y + HEADER_H - 14}
        fill="black"
        fontSize={FONT_HEADER}
        fontWeight="bold"
        textAnchor="middle">
        {chroma}
      </SvgText>,
    );
  });

  // Row headers + cells.
  page.values.forEach((value, rowIdx) => {
    const y = GRID_START_Y + HEADER_H + CELL_H * rowIdx;
    elements.push(
      <SvgText
        key={`row-${value}`}
        x={LABEL_W - 14}
        y={y + CELL_H / 2 + FONT_HEADER / 3}
        fill="black"
        fontSize={FONT_HEADER}
        fontWeight="bold"
        textAnchor="end">
        {value}
      </SvgText>,
    );

    page.chromas.forEach((chroma, colIdx) => {
      const cx = LABEL_W + CELL_W * colIdx;
      const key = `${value}/${chroma}`;
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
        return;
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
    });
  });

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
  kept: 'rgba(34,204,34,0.9)', // green
  kept_dark: 'rgba(0,220,0,0.9)', // green — dark swatch candidates (unused by new pipeline)
  kept_bright: 'rgba(34,204,34,0.9)', // green — THE detected circles (RANSAC input)
  reject_area_low: 'rgba(180,180,180,0.6)', // grey — noise
  reject_area_high: 'rgba(0,120,255,0.9)', // blue — chart body / paper
  reject_aspect: 'rgba(255,80,255,0.9)', // magenta — oblong
  reject_fill: 'rgba(255,160,0,0.9)', // orange — ring/text/hollow
  reject_mindim: 'rgba(140,140,140,0.7)', // grey — tiny
  reject_touches_edge: 'rgba(255,255,0,0.6)', // yellow — edge
  reject_brightness: 'rgba(150,100,50,0.7)', // brown — mid-value regions
  reject_low_contrast: 'rgba(200,50,50,0.5)', // dark red — paper fragmentation
};

// Statuses hidden from the legend and from the raw-blob overlay
// because they aren't meaningful to the new RANSAC-match pipeline:
// dark-classified circles aren't fed to the match, and the two
// rejections cover blobs that are neutral / low-contrast (which
// the match doesn't care about — they just aren't inputs).
const HIDDEN_STATUSES = new Set([
  'kept_dark',
  'reject_low_contrast',
  'reject_brightness',
  'reject_fill',
]);

// Display label for statuses that get renamed in the legend to match
// the vocabulary of the new pipeline (kept_bright → the actual
// "detected circles" fed to RANSAC).
const STATUS_LABEL: Record<string, string> = {
  kept_bright: 'detected',
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
}) => {
  const {previewRects, detectedSwatches, grid} = result;
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
        if (b.status === 'kept_bright') {
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
      {/* Fitted-grid intersections in yellow. Draw all REFERENCE_GRID
         points after the winning transform. Matched ones (inliers
         within matchThreshold of a detected point) get FILLED yellow
         so testers can see which ref points actually contributed to
         the score; unmatched ones stay hollow. Green centre dots for
         kept_bright detections are re-rendered after this pass so
         they stay visible on top of the fills. */}
      {grid.matchedGrid
        ? grid.matchedGrid.map((p, i) => (
            <Circle
              key={`mg-${i}`}
              cx={p.x}
              cy={p.y}
              r={10}
              stroke="#ffcc00"
              strokeWidth={3}
              fill={grid.matchedGridInliers?.[i] ? '#ffcc00' : 'none'}
            />
          ))
        : grid.centers.flatMap((row, ri) =>
            row.map((p, ci) => (
              <Rect
                key={`grid-${ri}-${ci}`}
                x={p.x - 3}
                y={p.y - 3}
                width={6}
                height={6}
                fill="#ffcc00"
              />
            )),
          )}
      {/* Green centre dots for kept_bright detections, drawn AFTER
         the yellow rings so they sit visibly on top of any inlier
         fill. Paired with the outer green rings drawn in the raw-
         blobs pass above. */}
      {grid.rawBlobs.map((b, i) => {
        if (b.status !== 'kept_bright') return null;
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
      {/* Sample ROIs (SAMPLE_GRID transformed) as red squares. These
         are the pixel regions the downstream analysis actually samples
         for per-swatch colour. */}
      {grid.matchedSampleRects?.map((r, i) => (
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
      {/* Per-swatch sampling rects in red — from the OLD cluster-fit
         pipeline. Hidden when the new RANSAC match ran. */}
      {!grid.matchedGrid &&
        previewRects.map((r, i) => (
          <Rect
            key={`roi-${i}`}
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            stroke="#ff2020"
            strokeWidth={2}
            fill="none"
          />
        ))}
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
  onBack,
}: {
  debug: MunsellChartFailureDebug;
  sharing: boolean;
  onShareDng: () => void;
  onBack: () => void;
}) => {
  const preview = debug.preview;
  const aspect = preview ? preview.width / preview.height : 4 / 3;
  return (
    <Column space="sm">
      <Text variant="body1" bold>
        Analysis failed
      </Text>
      <Paragraph>{debug.reason}</Paragraph>
      <Text variant="body2">
        {`whiteMask: lumaAnchor=${debug.lumaAnchor ?? 'n/a'}, `}
        {`lumaCutoff=${debug.lumaCutoff ?? 'n/a'}`}
      </Text>
      {debug.grid && (
        <Text variant="body2">
          {`rawBlobs=${debug.grid.rawBlobs.length}, `}
          {`detected=${debug.grid.detected.length}, `}
          {`cellW=${debug.grid.cellW.toFixed(1)}, cellH=${debug.grid.cellH.toFixed(1)}`}
        </Text>
      )}
      {preview && (
        <Box width="100%" aspectRatio={aspect} backgroundColor="grey.900">
          <Image
            source={{uri: preview.uri}}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
          />
          {debug.grid && (
            <Svg
              style={StyleSheet.absoluteFill}
              viewBox={`0 0 ${preview.width} ${preview.height}`}
              preserveAspectRatio="xMidYMid meet">
              {/* Reuse the debug overlay, forcing the white-mask
                 view on so the dev sees the mask + any candidate
                 blobs even though there's no fitted grid. Pass a
                 synthetic MunsellChartResult shape — only the
                 grid + preview fields are used by DebugOverlayLayers
                 for this call. */}
              <DebugOverlayLayers
                result={
                  {
                    grid: debug.grid,
                    preview,
                    previewRects: [],
                    detectedSwatches: [],
                    measurements: [],
                    matchedSampleValues: null,
                  } as unknown as MunsellChartResult
                }
                maskView="bright"
              />
            </Svg>
          )}
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
          <ContainedButton label="Back" onPress={onBack} stretchToFit />
        </Box>
      </Row>
    </Column>
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
}: {
  rawBlobs: MunsellChartResult['grid']['rawBlobs'];
  matchedScore: number | null;
}) => {
  const counts: Record<string, number> = {};
  for (const b of rawBlobs) counts[b.status] = (counts[b.status] ?? 0) + 1;
  const entries = Object.entries(counts)
    .filter(([status]) => !HIDDEN_STATUSES.has(status))
    .sort(([, a], [, b]) => b - a);
  return (
    <View style={styles.legendContainer} pointerEvents="none">
      {matchedScore != null && (
        <RNText style={styles.legendLine}>
          <RNText style={{color: '#ffcc00'}}>■</RNText>
          {`  match: ${matchedScore.toFixed(1)} / ${
            counts.kept_bright
              ? Math.min(REFERENCE_GRID.length, counts.kept_bright)
              : REFERENCE_GRID.length
          } (of ${REFERENCE_GRID.length} ref)`}
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
