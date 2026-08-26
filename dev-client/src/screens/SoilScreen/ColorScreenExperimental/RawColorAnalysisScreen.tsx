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

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Alert, Image, StyleSheet, View} from 'react-native';

import {DngDecoderHybrid} from 'dng-decoder';

import {trackSoilObservation} from 'terraso-mobile-client/analytics/soilObservationTracking';
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
import {
  munsellToRGB,
  munsellToString,
} from 'terraso-mobile-client/model/color/colorConversions';
import {listCustomReferences} from 'terraso-mobile-client/model/color/customReferences';
import {
  getColorFromLinearRgb,
  LinearRgb,
  RankedReference,
  rankReferences,
} from 'terraso-mobile-client/model/color/getColorFromLinearRgb';
import {updateDepthDependentSoilData} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {kvStorage} from 'terraso-mobile-client/persistence/kvStorage';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {
  linearRgbToCss,
  PipelineColumn,
  PreviewRect,
  rgb255ToCss,
} from 'terraso-mobile-client/screens/SoilScreen/ColorScreenExperimental/pipelineColumn';
import {
  RawAnalysisRole,
  RawCrop,
  resetRawAnalysisSession,
  useRawAnalysisSession,
} from 'terraso-mobile-client/screens/SoilScreen/ColorScreenExperimental/rawAnalysisSession';
import {SoilPitInputScreenProps} from 'terraso-mobile-client/screens/SoilScreen/components/SoilPitInputScreenScaffold';
import {useDispatch} from 'terraso-mobile-client/store';

// Persisted between captures. If the stored id no longer exists in
// the ranked list (reference was deleted from customReferences, or
// builtin renamed), the auto-select silently falls back to the top-
// ranked entry — see resolveInitialRefId below.
const LAST_USED_REF_KEY = 'soilColor.lastUsedReferenceId';
// Sticky picker for the mean/dominant ROI reducer — see the state
// initialiser on RawColorAnalysisScreen.
const LAST_USED_REDUCER_KEY = 'soilColor.lastUsedReducer';

// Confidence = max(0, 1 - deltaE/40). At the threshold below (0.6)
// deltaE is ~16 — a meaningful chromaticity mismatch between the
// measured card and the selected reference, i.e. "probably wrong
// card, or the light was really unusual". Show a warning so the user
// can double-check before treating the result as authoritative.
const LOW_CONFIDENCE_WARNING_THRESHOLD = 0.6;

export type RawColorAnalysisProps = {
  /** file:// URI to the captured DNG. */
  dngPath: string;
  /**
   * Full sensor dimensions from the vision-camera Photo object. Used to
   * scale ROI coordinates picked in preview space up to sensor space
   * before calling decodeDngRois.
   */
  sensorWidth: number;
  sensorHeight: number;
  pitProps: SoilPitInputScreenProps;
  /**
   * When set, skip the manual crop-picker step and run analysis against
   * the given fractional ROIs directly. Used by the RAW-Live capture
   * flow — the user placed the card + sample into the overlay boxes at
   * shot time, so re-cropping would just repeat that positioning.
   * Fractions are in the display coord system of the captured DNG (same
   * space the CIRAWFilter-rendered preview lives in), i.e. x, y, w, h
   * all in [0, 1].
   */
  preSelectedDisplayRois?: {
    ref: {x: number; y: number; w: number; h: number};
    sample: {x: number; y: number; w: number; h: number};
  };
};

// Analysis home for the experimental RAW capture path. User selects
// two crops sequentially — reference card, then soil sample — each
// using the pan/pinch-square UX (RawCropScreen), parallel to how the
// production JPEG-path ColorAnalysisHomeScreen dispatches to
// ColorCropReferenceScreen + ColorCropSoilScreen. Selected crops are
// stored in the module-scope rawAnalysisSession; when both are set,
// Analyze becomes enabled. Analyze scales crops from preview coords
// to sensor coords, decodes via DngDecoderHybrid, runs
// getColorFromLinearRgb, dispatches to Redux, pops.
export const RawColorAnalysisScreen = ({
  dngPath,
  sensorWidth,
  sensorHeight,
  pitProps,
  preSelectedDisplayRois,
}: RawColorAnalysisProps) => {
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const session = useRawAnalysisSession();
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  // Populated once decode succeeds. The dropdown + result view render
  // off this. `card` / `sample` are cached so changing the selected
  // reference on the result view recomputes Munsell locally without
  // re-decoding the DNG. `refRect` / `sampleRect` / `preview` are
  // stored for the debug crop views below the swatches — they show
  // WHICH region of the preview was actually sampled so a
  // misalignment between visible overlay and analyzed region is
  // visible at a glance.
  const [analyzed, setAnalyzed] = useState<{
    card: LinearRgb;
    sample: LinearRgb;
    // Median-cut dominant companions to card/sample, for the reducer
    // toggle below. Same units + coord frame.
    cardDominant: LinearRgb;
    sampleDominant: LinearRgb;
    ranked: RankedReference[];
    refRect: PreviewRect;
    sampleRect: PreviewRect;
    preview: {uri: string; width: number; height: number};
  } | null>(null);
  const [selectedRefId, setSelectedRefId] = useState<string | null>(null);
  // Reducer pick. 'mean' = per-channel arithmetic average of the ROI
  // (the new pipeline's default). 'dominant' = median-cut biggest-
  // cluster centroid — same semantic as the legacy JPEG dominantColor
  // path, robust to a handful of off-tone flecks in the sample.
  // Persisted per-session in kvStorage; each subsequent capture opens
  // on whatever the user last picked so an A/B comparison across
  // shutters stays stable without re-toggling.
  const [reducer, setReducer] = useState<'mean' | 'dominant'>(
    () =>
      (kvStorage.getString(LAST_USED_REDUCER_KEY) as
        | 'mean'
        | 'dominant'
        | undefined) ?? 'mean',
  );
  const onSelectReducer = useCallback((v: 'mean' | 'dominant') => {
    setReducer(v);
    kvStorage.setString(LAST_USED_REDUCER_KEY, v);
  }, []);
  // Flipped true only AFTER renderPreview for the CURRENT dngPath has
  // completed and repopulated the module-scope session. Gates the
  // auto-analyze effect below so it doesn't fire with a stale
  // session.preview left over from the previous capture — the reset
  // + renderPreview happen inside a useEffect (post-commit), so the
  // FIRST render of a 2nd capture still sees the old capture's
  // session state via useSyncExternalStore.
  const [previewReady, setPreviewReady] = useState(false);

  // Render the preview once (per capture). Cache the result in the
  // session so navigating between the crop screens doesn't re-render.
  useEffect(() => {
    setPreviewReady(false);
    resetRawAnalysisSession(null);
    let stale = false;
    (async () => {
      try {
        const p = await DngDecoderHybrid.renderPreview(dngPath, 1200);
        // Guard against a later dngPath change racing this one — if
        // the component unmounted or the effect re-ran with a new
        // dngPath, don't overwrite the newer state.
        if (stale) return;
        resetRawAnalysisSession({
          uri: p.uri,
          width: p.width,
          height: p.height,
        });
        setPreviewReady(true);
      } catch (err) {
        console.error('renderPreview failed:', err);
        setPreviewError(String(err));
      }
    })();
    return () => {
      stale = true;
    };
  }, [dngPath]);

  const gotoCrop = useCallback(
    (role: RawAnalysisRole) => {
      navigation.navigate('RAW_COLOR_CROP_EXPERIMENTAL', {role});
    },
    [navigation],
  );

  // Both entry points (manual crop-picker Analyze button + auto-run
  // from preSelectedDisplayRois) funnel here. Callers pass explicit
  // preview-space rects so this doesn't have to branch on the source.
  const runAnalyze = useCallback(
    async (
      preview: {uri: string; width: number; height: number},
      refRect: PreviewRect,
      sampleRect: PreviewRect,
    ) => {
      setAnalyzing(true);
      let decoded: Awaited<ReturnType<typeof decodeRects>>;
      try {
        decoded = await decodeRects({
          dngPath,
          sensorWidth,
          sensorHeight,
          preview,
          refRect,
          sampleRect,
        });
      } catch (err) {
        console.error('RAW decode failed:', err);
        Alert.alert('Analyze failed', String(err));
        setAnalyzing(false);
        return;
      }

      // Rank predefined + user-calibrated references against the
      // measured card. Ranking uses the CURRENTLY-active reducer so
      // the top-ranked entry matches what the user sees in the
      // pipeline column. When the toggle flips, the reranking + auto-
      // reselect happen in the reactiveRank useMemo below.
      const activeCardForRank =
        reducer === 'dominant' ? decoded.cardDominant : decoded.card;
      const ranked = rankReferences(activeCardForRank, listCustomReferences());
      const persisted = kvStorage.getString(LAST_USED_REF_KEY);
      const initialRefId =
        persisted && ranked.some(r => r.id === persisted)
          ? persisted
          : (ranked[0]?.id ?? null);
      setAnalyzed({
        card: decoded.card,
        sample: decoded.sample,
        cardDominant: decoded.cardDominant,
        sampleDominant: decoded.sampleDominant,
        ranked,
        refRect,
        sampleRect,
        preview,
      });
      setSelectedRefId(initialRefId);
      setAnalyzing(false);
    },
    [dngPath, sensorWidth, sensorHeight, reducer],
  );

  // Manual-picker Analyze button — pulls crops from the session and
  // converts each square RawCrop into a PreviewRect for runAnalyze.
  const onAnalyze = useCallback(() => {
    if (!session.refCrop || !session.sampleCrop || !session.preview) return;
    const cropToRect = (c: RawCrop): PreviewRect => ({
      left: c.left,
      top: c.top,
      width: c.size,
      height: c.size,
    });
    runAnalyze(
      session.preview,
      cropToRect(session.refCrop),
      cropToRect(session.sampleCrop),
    );
  }, [session.refCrop, session.sampleCrop, session.preview, runAnalyze]);

  // Auto-analyze path for RAW-Live: as soon as the preview loads,
  // convert the fractional display ROIs into preview-space rects and
  // fire runAnalyze once. autoRanRef guards against re-firing on
  // re-renders (preview identity is stable, but React can still re-run
  // effects on fast-refresh / dev cycles). previewReady gates until
  // the renderPreview for the CURRENT dngPath has completed — without
  // this, the FIRST render of a subsequent capture would race the
  // reset useEffect and read the previous capture's session.preview.
  const autoRanRef = useRef(false);
  useEffect(() => {
    if (!previewReady) return;
    if (!preSelectedDisplayRois) return;
    if (autoRanRef.current) return;
    if (!session.preview) return;
    autoRanRef.current = true;
    const toRect = (roi: {
      x: number;
      y: number;
      w: number;
      h: number;
    }): PreviewRect => ({
      left: roi.x * session.preview!.width,
      top: roi.y * session.preview!.height,
      width: roi.w * session.preview!.width,
      height: roi.h * session.preview!.height,
    });
    runAnalyze(
      session.preview,
      toRect(preSelectedDisplayRois.ref),
      toRect(preSelectedDisplayRois.sample),
    );
  }, [previewReady, preSelectedDisplayRois, session.preview, runAnalyze]);

  // Reducer-aware active card/sample pair. Downstream ranking + WB +
  // Munsell all consume these; flipping the reducer toggle just
  // re-derives without re-decoding the DNG.
  const activeCard = useMemo<LinearRgb | null>(() => {
    if (!analyzed) return null;
    return reducer === 'dominant' ? analyzed.cardDominant : analyzed.card;
  }, [analyzed, reducer]);
  const activeSample = useMemo<LinearRgb | null>(() => {
    if (!analyzed) return null;
    return reducer === 'dominant' ? analyzed.sampleDominant : analyzed.sample;
  }, [analyzed, reducer]);

  // Re-rank references whenever the reducer flips. The initial rank
  // in runAnalyze uses the reducer active at capture time; when the
  // toggle changes here, references are re-scored against the newly-
  // active card. selectedRefId is preserved when it still exists in
  // the new ranking; otherwise falls back to the top entry.
  const ranked = useMemo<RankedReference[]>(() => {
    if (!analyzed || !activeCard) return [];
    return rankReferences(activeCard, listCustomReferences());
  }, [analyzed, activeCard]);
  useEffect(() => {
    if (ranked.length === 0) return;
    setSelectedRefId(prev => {
      if (prev && ranked.some(r => r.id === prev)) return prev;
      return ranked[0]?.id ?? null;
    });
  }, [ranked]);

  // Currently-selected ranked entry. Null if analyzed hasn't run yet
  // or if selectedRefId doesn't resolve.
  const selectedRef: RankedReference | null = useMemo(() => {
    if (!selectedRefId) return null;
    return ranked.find(r => r.id === selectedRefId) ?? null;
  }, [ranked, selectedRefId]);

  // Recompute Munsell whenever card/sample/selected-reference changes.
  // Splitting the color computation out of the dispatch effect below
  // lets us render the notation in the result view without triggering
  // an extra Redux round-trip.
  const munsell = useMemo(() => {
    if (!activeCard || !activeSample || !selectedRef) return null;
    const result = getColorFromLinearRgb(
      activeCard,
      activeSample,
      selectedRef.linearRgb,
    );
    const hvc = 'result' in result ? result.result : result.nearestValidResult;
    return {hvc, text: munsellToString(hvc)};
  }, [activeCard, activeSample, selectedRef]);

  // Dispatch the current Munsell to Redux whenever it changes — same
  // aggressive-save semantics as the rest of the color screen. Backing
  // out preserves whatever was last dispatched.
  useEffect(() => {
    if (!munsell) return;
    dispatch(
      updateDepthDependentSoilData({
        siteId: pitProps.siteId,
        depthInterval: pitProps.depthInterval.depthInterval,
        colorHue: munsell.hvc.colorHue,
        colorValue: munsell.hvc.colorValue,
        colorChroma: munsell.hvc.colorChroma,
        colorPhotoUsed: true,
      }),
    );
    trackSoilObservation({
      input_type: 'soil_color',
      input_method: 'photo',
      site_id: pitProps.siteId,
      depthInterval: pitProps.depthInterval.depthInterval,
    });
  }, [munsell, dispatch, pitProps.siteId, pitProps.depthInterval]);

  // User picked a different reference from the dropdown. Update local
  // state (recomputes munsell + fires the dispatch effect) and persist
  // for next capture.
  const onSelectReference = useCallback((id: string) => {
    setSelectedRefId(id);
    kvStorage.setString(LAST_USED_REF_KEY, id);
  }, []);

  if (previewError) {
    return (
      <ScreenScaffold AppBar={<AppBar title="RAW analysis (experimental)" />}>
        <SafeScrollView>
          <Column padding="md" space="md">
            <Text variant="body1" bold>
              Could not load preview
            </Text>
            <Paragraph>{previewError}</Paragraph>
          </Column>
        </SafeScrollView>
      </ScreenScaffold>
    );
  }

  return (
    <ScreenScaffold AppBar={<AppBar title="RAW analysis (experimental)" />}>
      <SafeScrollView>
        <Column padding="md" space="md">
          {!analyzed && (
            <Paragraph>
              {preSelectedDisplayRois
                ? 'Analyzing the reference card and soil sample regions you framed in the overlay…'
                : 'Select the reference card region, then the soil sample region. Pan/pinch inside each crop screen to frame precisely.'}
            </Paragraph>
          )}
          {!analyzed && (
            <PreviewThumbnail
              uri={session.preview?.uri}
              aspectRatio={
                session.preview
                  ? session.preview.width / session.preview.height
                  : 3 / 4
              }
            />
          )}
          {!analyzed && !preSelectedDisplayRois && (
            <>
              <Row space="sm">
                <SelectButton
                  label="Reference card"
                  selected={!!session.refCrop}
                  onPress={() => gotoCrop('reference')}
                  disabled={!session.preview}
                />
                <SelectButton
                  label="Soil sample"
                  selected={!!session.sampleCrop}
                  onPress={() => gotoCrop('sample')}
                  disabled={!session.preview}
                />
              </Row>
              <ContainedButton
                label={analyzing ? 'Analyzing…' : 'Analyze'}
                onPress={onAnalyze}
                disabled={
                  !session.preview ||
                  !session.refCrop ||
                  !session.sampleCrop ||
                  analyzing
                }
              />
            </>
          )}
          {!analyzed && preSelectedDisplayRois && analyzing && (
            <Paragraph>Analyzing…</Paragraph>
          )}
          {analyzed && activeCard && activeSample && selectedRef && munsell && (
            <ResultView
              card={activeCard}
              sample={activeSample}
              ranked={ranked}
              selectedRef={selectedRef}
              munsellText={munsell.text}
              munsellHvc={munsell.hvc}
              onSelectReference={onSelectReference}
              onDone={() => navigation.pop()}
              refRect={analyzed.refRect}
              sampleRect={analyzed.sampleRect}
              preview={analyzed.preview}
              reducer={reducer}
              onSelectReducer={onSelectReducer}
            />
          )}
        </Column>
      </SafeScrollView>
    </ScreenScaffold>
  );
};

// Post-analyze result panel — captured-color swatches + reference
// dropdown + current Munsell + low-confidence warning + Done. Shows
// the RAW measured colors (before WB correction) as swatches so the
// user can eyeball whether the analyzer sampled sensible regions;
// the Munsell text below reflects those colors after the WB
// correction against the selected reference.
const ResultView = ({
  card,
  sample,
  ranked,
  selectedRef,
  munsellText,
  munsellHvc,
  onSelectReference,
  onDone,
  refRect,
  sampleRect,
  preview,
  reducer,
  onSelectReducer,
}: {
  card: LinearRgb;
  sample: LinearRgb;
  ranked: RankedReference[];
  selectedRef: RankedReference;
  munsellText: string;
  munsellHvc: {colorHue: number; colorValue: number; colorChroma: number};
  onSelectReference: (id: string) => void;
  onDone: () => void;
  refRect: PreviewRect;
  sampleRect: PreviewRect;
  preview: {uri: string; width: number; height: number};
  reducer: 'mean' | 'dominant';
  onSelectReducer: (v: 'mean' | 'dominant') => void;
}) => {
  const lowConfidence =
    selectedRef.confidence < LOW_CONFIDENCE_WARNING_THRESHOLD;
  // sRGB 0-255 triple for the Munsell chip corresponding to the
  // current result — this is the "quantised" chip color the user
  // asked for on the bottom-right of the pipeline. `munsellToRGB`
  // returns a display-ready gamma-encoded triple so we render it
  // directly (no gamma re-encoding).
  const munsellChipRgb255 = munsellToRGB(munsellHvc);
  return (
    <>
      {/* Two-column pipeline visualisation:
         Reference: photo → avg → ref-card rgb (picked reference expected)
         Soil:      photo → avg → Munsell chip rgb (quantized result)
         The `correction` step is derived from the ref side
         (per-channel gain that maps measured ref onto expected ref)
         and applied identically on the soil side. */}
      <Row space="lg" alignItems="flex-start" justifyContent="center">
        <PipelineColumn
          heading="Reference"
          photoRect={refRect}
          preview={preview}
          measuredLinearRgb={card}
          finalCss={linearRgbToCss(selectedRef.linearRgb)}
          finalLabel="ref card"
        />
        <PipelineColumn
          heading="Soil"
          photoRect={sampleRect}
          preview={preview}
          measuredLinearRgb={sample}
          finalCss={rgb255ToCss(munsellChipRgb255)}
          finalLabel="result (chip)"
        />
      </Row>
      <Text variant="body1" bold>
        Soil color: {munsellText}
      </Text>
      <ReducerToggle value={reducer} onChange={onSelectReducer} />
      <Select<string, false>
        nullable={false}
        options={ranked.map(r => r.id)}
        value={selectedRef.id}
        onValueChange={onSelectReference}
        renderValue={id => {
          const r = ranked.find(x => x.id === id);
          if (!r) return id;
          return `${r.name}  (ΔE ${r.deltaE.toFixed(1)}, ${Math.round(
            r.confidence * 100,
          )}%)`;
        }}
        label="Reference card"
      />
      {lowConfidence && (
        <Box
          padding="sm"
          borderRadius="4px"
          borderWidth="1px"
          borderColor="warning.main"
          backgroundColor="warning.background">
          <Text variant="body2" bold>
            Low-confidence reference match
          </Text>
          <Text variant="caption">
            The selected reference matches the measured card at only{' '}
            {Math.round(selectedRef.confidence * 100)}% confidence (ΔE{' '}
            {selectedRef.deltaE.toFixed(1)}). Double-check that you picked the
            reference card you actually used — the Munsell result above depends
            on this being correct.
          </Text>
        </Box>
      )}
      <ContainedButton label="Done" onPress={onDone} />
    </>
  );
};

// Pipeline column bits moved to ./pipelineColumn.tsx so the calibrate
// results view can use the same layout. See imports at the top of
// this file for PipelineColumn / RoiCropSquare / linearRgbToCss /
// rgb255ToCss.

const PreviewThumbnail = ({
  uri,
  aspectRatio,
}: {
  uri: string | undefined;
  aspectRatio: number;
}) => (
  <Box
    width="100%"
    aspectRatio={aspectRatio}
    backgroundColor="grey.900"
    overflow="hidden">
    {uri && (
      <View style={StyleSheet.absoluteFill}>
        <Image
          source={{uri}}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
        />
      </View>
    )}
  </Box>
);

// Two-button "segmented" toggle for the ROI reducer pick. Kept simple
// (a pair of ContainedButtons in a row, filled/outlined by state) so
// it renders identically on iOS + Android without pulling in a
// segmented-control lib. The Munsell result + ranking below reactively
// recompute the instant the value changes — no re-decode, so switches
// are effectively free.
const ReducerToggle = ({
  value,
  onChange,
}: {
  value: 'mean' | 'dominant';
  onChange: (v: 'mean' | 'dominant') => void;
}) => (
  <Row space="sm">
    <Box flex={1}>
      <ContainedButton
        label={`${value === 'mean' ? '✓ ' : ''}Mean (average)`}
        onPress={() => onChange('mean')}
        stretchToFit={true}
      />
    </Box>
    <Box flex={1}>
      <ContainedButton
        label={`${value === 'dominant' ? '✓ ' : ''}Dominant (posterise)`}
        onPress={() => onChange('dominant')}
        stretchToFit={true}
      />
    </Box>
  </Row>
);

const SelectButton = ({
  label,
  selected,
  onPress,
  disabled,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled: boolean;
}) => (
  <Box flex={1}>
    <ContainedButton
      label={`${selected ? '✓ ' : ''}${label}`}
      onPress={onPress}
      disabled={disabled}
      stretchToFit={true}
    />
  </Box>
);

// Scale preview-space rectangles up to sensor-space ROIs and call
// decodeDngRoisReduced. Returns both the per-channel mean and the
// median-cut dominant per ROI so the caller can flip reducers
// (matches the legacy JPEG posterise pipeline) without re-decoding
// the DNG. `card` / `sample` = mean; `cardDominant` / `sampleDominant`
// = dominant; the caller's reducer toggle picks which pair feeds
// Munsell downstream.
const decodeRects = async ({
  dngPath,
  sensorWidth,
  sensorHeight,
  preview,
  refRect,
  sampleRect,
}: {
  dngPath: string;
  sensorWidth: number;
  sensorHeight: number;
  preview: {width: number; height: number};
  refRect: PreviewRect;
  sampleRect: PreviewRect;
}): Promise<{
  card: LinearRgb;
  sample: LinearRgb;
  cardDominant: LinearRgb;
  sampleDominant: LinearRgb;
}> => {
  // Vision-camera reports photo.width/height in the DNG's *pre-orientation*
  // dimensions — iPhone in portrait writes a landscape 4032×3024 DNG with
  // Orientation=6 (rotate 90 CW). CIRAWFilter honors the orientation tag,
  // so its outputImage — and our rendered preview PNG — comes back rotated
  // to portrait 3024×4032. Detect the orientation mismatch from the aspect
  // ratios and swap dims so preview→sensor scaling matches the coord
  // space decodeDngRois actually uses (which is CIRAWFilter's extent, i.e.
  // the same orientation as the preview).
  const previewIsPortrait = preview.width < preview.height;
  const rawSensorIsPortrait = sensorWidth < sensorHeight;
  const effectiveSensorWidth =
    previewIsPortrait === rawSensorIsPortrait ? sensorWidth : sensorHeight;
  const effectiveSensorHeight =
    previewIsPortrait === rawSensorIsPortrait ? sensorHeight : sensorWidth;
  const scaleX = effectiveSensorWidth / preview.width;
  const scaleY = effectiveSensorHeight / preview.height;
  const toSensor = (r: PreviewRect) => ({
    x: Math.round(r.left * scaleX),
    y: Math.round(r.top * scaleY),
    w: Math.round(r.width * scaleX),
    h: Math.round(r.height * scaleY),
  });
  const refSensor = toSensor(refRect);
  const sampleSensor = toSensor(sampleRect);
  // TEMPORARY debug — trace every coordinate transform in the RAW
  // analysis pipeline so we can see whether wrong ROIs are being sampled.
  console.log(
    `RAW analyze coords: preview=${preview.width}x${preview.height} sensor(raw)=${sensorWidth}x${sensorHeight} sensor(effective)=${effectiveSensorWidth}x${effectiveSensorHeight} scaleX=${scaleX.toFixed(3)} scaleY=${scaleY.toFixed(3)}`,
  );
  console.log(
    `  refRect(preview)=${JSON.stringify(refRect)} → refROI(sensor)=${JSON.stringify(refSensor)}`,
  );
  console.log(
    `  sampleRect(preview)=${JSON.stringify(sampleRect)} → sampleROI(sensor)=${JSON.stringify(sampleSensor)}`,
  );
  const [refReduced, sampleReduced] =
    await DngDecoderHybrid.decodeDngRoisReduced(dngPath, [
      refSensor,
      sampleSensor,
    ]);
  console.log(
    `  decoded card mean=(${refReduced.mean.r.toFixed(3)},${refReduced.mean.g.toFixed(3)},${refReduced.mean.b.toFixed(3)}) ` +
      `dom=(${refReduced.dominant.r.toFixed(3)},${refReduced.dominant.g.toFixed(3)},${refReduced.dominant.b.toFixed(3)}) ` +
      `sample mean=(${sampleReduced.mean.r.toFixed(3)},${sampleReduced.mean.g.toFixed(3)},${sampleReduced.mean.b.toFixed(3)}) ` +
      `dom=(${sampleReduced.dominant.r.toFixed(3)},${sampleReduced.dominant.g.toFixed(3)},${sampleReduced.dominant.b.toFixed(3)})`,
  );
  return {
    card: refReduced.mean,
    sample: sampleReduced.mean,
    cardDominant: refReduced.dominant,
    sampleDominant: sampleReduced.dominant,
  };
};
