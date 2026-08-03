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
import Svg, {Image as SvgImage} from 'react-native-svg';

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
import {munsellToString} from 'terraso-mobile-client/model/color/colorConversions';
import {linearToSrgb} from 'terraso-mobile-client/model/color/colorDetection';
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
    ranked: RankedReference[];
    refRect: PreviewRect;
    sampleRect: PreviewRect;
    preview: {uri: string; width: number; height: number};
  } | null>(null);
  const [selectedRefId, setSelectedRefId] = useState<string | null>(null);

  // Render the preview once (per capture). Cache the result in the
  // session so navigating between the crop screens doesn't re-render.
  useEffect(() => {
    resetRawAnalysisSession(null);
    (async () => {
      try {
        const p = await DngDecoderHybrid.renderPreview(dngPath, 1200);
        resetRawAnalysisSession({
          uri: p.uri,
          width: p.width,
          height: p.height,
        });
      } catch (err) {
        console.error('renderPreview failed:', err);
        setPreviewError(String(err));
      }
    })();
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
      let decoded: {card: LinearRgb; sample: LinearRgb};
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
      // measured card. No modal picker — the result view below the
      // preview shows a Select dropdown and lets the user change the
      // reference in-place, with the Munsell result recomputing as
      // they do. Auto-select "last used" (persisted across captures)
      // if it's still in the ranked list, else the top-ranked entry.
      const ranked = rankReferences(decoded.card, listCustomReferences());
      const persisted = kvStorage.getString(LAST_USED_REF_KEY);
      const initialRefId =
        persisted && ranked.some(r => r.id === persisted)
          ? persisted
          : (ranked[0]?.id ?? null);
      setAnalyzed({
        card: decoded.card,
        sample: decoded.sample,
        ranked,
        refRect,
        sampleRect,
        preview,
      });
      setSelectedRefId(initialRefId);
      setAnalyzing(false);
    },
    [dngPath, sensorWidth, sensorHeight],
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
  // effects on fast-refresh / dev cycles).
  const autoRanRef = useRef(false);
  useEffect(() => {
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
  }, [preSelectedDisplayRois, session.preview, runAnalyze]);

  // Currently-selected ranked entry. Null if analyzed hasn't run yet
  // or if selectedRefId doesn't resolve (e.g. stale kvStorage entry
  // that got pruned — shouldn't happen given resolveInitialRefId
  // above, but the type demands the guard).
  const selectedRef: RankedReference | null = useMemo(() => {
    if (!analyzed || !selectedRefId) return null;
    return analyzed.ranked.find(r => r.id === selectedRefId) ?? null;
  }, [analyzed, selectedRefId]);

  // Recompute Munsell whenever card/sample/selected-reference changes.
  // Splitting the color computation out of the dispatch effect below
  // lets us render the notation in the result view without triggering
  // an extra Redux round-trip.
  const munsell = useMemo(() => {
    if (!analyzed || !selectedRef) return null;
    const result = getColorFromLinearRgb(
      analyzed.card,
      analyzed.sample,
      selectedRef.linearRgb,
    );
    const hvc = 'result' in result ? result.result : result.nearestValidResult;
    return {hvc, text: munsellToString(hvc)};
  }, [analyzed, selectedRef]);

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
          {analyzed && selectedRef && munsell && (
            <ResultView
              card={analyzed.card}
              sample={analyzed.sample}
              ranked={analyzed.ranked}
              selectedRef={selectedRef}
              munsellText={munsell.text}
              onSelectReference={onSelectReference}
              onDone={() => navigation.pop()}
              refRect={analyzed.refRect}
              sampleRect={analyzed.sampleRect}
              preview={analyzed.preview}
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
  onSelectReference,
  onDone,
  refRect,
  sampleRect,
  preview,
}: {
  card: LinearRgb;
  sample: LinearRgb;
  ranked: RankedReference[];
  selectedRef: RankedReference;
  munsellText: string;
  onSelectReference: (id: string) => void;
  onDone: () => void;
  refRect: PreviewRect;
  sampleRect: PreviewRect;
  preview: {uri: string; width: number; height: number};
}) => {
  const lowConfidence =
    selectedRef.confidence < LOW_CONFIDENCE_WARNING_THRESHOLD;
  return (
    <>
      {/* DEBUG: crop views showing the EXACT preview region each ROI
         was sampled from. If these don't match the boxes the user
         framed, the analyzer is sampling the wrong area. */}
      <Row space="md" alignItems="center">
        <RoiCrop label="Reference" rect={refRect} preview={preview} />
        <RoiCrop label="Soil" rect={sampleRect} preview={preview} />
      </Row>
      <Row space="md" alignItems="center">
        <CapturedSwatch label="Ref (avg)" linearRgb={card} />
        <CapturedSwatch label="Soil (avg)" linearRgb={sample} />
      </Row>
      <Text variant="body1" bold>
        Soil color: {munsellText}
      </Text>
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

// Labelled colored square for a measured linear-sRGB triple. Renders
// the color gamma-encoded so it looks right on-screen; the underlying
// numbers are stored linear.
const CapturedSwatch = ({
  label,
  linearRgb,
}: {
  label: string;
  linearRgb: LinearRgb;
}) => {
  const toByte = (v: number) => Math.round(linearToSrgb(v));
  const css = `rgb(${toByte(linearRgb.r)}, ${toByte(linearRgb.g)}, ${toByte(linearRgb.b)})`;
  return (
    <Column alignItems="center" space="sm">
      <Box
        width="72px"
        height="72px"
        borderRadius="4px"
        borderWidth="1px"
        borderColor="grey.500"
        backgroundColor={css}
      />
      <Text variant="caption">{label}</Text>
    </Column>
  );
};

// Debug crop view — shows the EXACT region of the preview that was
// sampled for one ROI. Uses SVG viewBox to crop without needing an
// image-manipulator pass. If this crop doesn't visually match the
// content the user thought was inside the box (e.g. it shows chart
// body when the box was on the card), the analyzer's coord math is
// off — the ROI drawn on the live camera and the ROI sampled from
// the DNG have drifted apart.
const RoiCrop = ({
  label,
  rect,
  preview,
}: {
  label: string;
  rect: PreviewRect;
  preview: {uri: string; width: number; height: number};
}) => {
  const displayW = 100;
  const displayH = 100;
  return (
    <Column alignItems="center" space="sm">
      <View style={[styles.roiCropBox, {width: displayW, height: displayH}]}>
        <Svg
          width="100%"
          height="100%"
          viewBox={`${rect.left} ${rect.top} ${rect.width} ${rect.height}`}
          preserveAspectRatio="xMidYMid slice">
          <SvgImage
            href={preview.uri}
            x={0}
            y={0}
            width={preview.width}
            height={preview.height}
            preserveAspectRatio="xMidYMid meet"
          />
        </Svg>
      </View>
      <Text variant="caption">{label}</Text>
    </Column>
  );
};

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

type PreviewRect = {left: number; top: number; width: number; height: number};

// Scale preview-space rectangles up to sensor-space ROIs and call
// decodeDngRois. Returns the two per-ROI linear-sRGB averages so the
// caller can rank references before choosing which one to correct
// against.
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
}): Promise<{card: LinearRgb; sample: LinearRgb}> => {
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
  const [card, sample] = await DngDecoderHybrid.decodeDngRois(dngPath, [
    refSensor,
    sampleSensor,
  ]);
  console.log(
    `  decoded card=(${card.r.toFixed(3)},${card.g.toFixed(3)},${card.b.toFixed(3)}) ` +
      `sample=(${sample.r.toFixed(3)},${sample.g.toFixed(3)},${sample.b.toFixed(3)})`,
  );
  return {card, sample};
};

const styles = StyleSheet.create({
  roiCropBox: {
    borderWidth: 1,
    borderColor: '#8a8a8a',
    borderRadius: 4,
    overflow: 'hidden',
  },
});
