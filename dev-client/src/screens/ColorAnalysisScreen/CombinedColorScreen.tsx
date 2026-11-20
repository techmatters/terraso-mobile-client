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

import {useCallback, useEffect, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {
  Image,
  Pressable,
  Text as RNText,
  View as RNView,
  StyleSheet,
} from 'react-native';
import Share from 'react-native-share';

import {ActionCrop, manipulateAsync, SaveFormat} from 'expo-image-manipulator';

import {DngDecoderHybrid} from 'dng-decoder';

import {trackSoilObservation} from 'terraso-mobile-client/analytics/soilObservationTracking';
import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {Fab} from 'terraso-mobile-client/components/buttons/Fab';
import {
  ImagePicker,
  Photo,
} from 'terraso-mobile-client/components/inputs/image/ImagePicker';
import {ReferenceColorPicker} from 'terraso-mobile-client/components/inputs/ReferenceColorPicker';
import {
  Box,
  Column,
  Heading,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {SafeScrollViewWithFab} from 'terraso-mobile-client/components/safeview/SafeScrollViewWithFab';
import {munsellToRGB} from 'terraso-mobile-client/model/color/colorConversions';
import {linearToSrgb255} from 'terraso-mobile-client/model/color/colorDetection';
import {MunsellColor} from 'terraso-mobile-client/model/color/types';
import {useSelectedReference} from 'terraso-mobile-client/model/rawColor/referenceColorSelection';
import type {LinearRgb} from 'terraso-mobile-client/model/rawColor/types';
import {updateDepthDependentSoilData} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {
  ColorCropScreen,
  type CropResult,
} from 'terraso-mobile-client/screens/ColorAnalysisScreen/components/ColorCropScreen';
import {
  ColorPipelineGrid,
  cssRgb,
  type PipelineColumn,
  type Rgb255,
} from 'terraso-mobile-client/screens/ColorAnalysisScreen/components/ColorPipelineGrid';
import {DominantColorEditor} from 'terraso-mobile-client/screens/ColorAnalysisScreen/components/DominantColorEditor';
import {
  ColorAnalysisContext,
  type ColorAnalysisContextState,
} from 'terraso-mobile-client/screens/ColorAnalysisScreen/context/colorAnalysisContext';
import {useColorPipeline} from 'terraso-mobile-client/screens/ColorAnalysisScreen/useColorPipeline';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {ColorDisplay} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/components/ColorDisplay';
import {PhotoConditions} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/components/PhotoConditions';
import {SoilPitInputScreenProps} from 'terraso-mobile-client/screens/SoilScreen/components/SoilPitInputScreenScaffold';
import {useDispatch} from 'terraso-mobile-client/store';

const toRgb255 = (c: LinearRgb): Rgb255 => [
  linearToSrgb255(c.r),
  linearToSrgb255(c.g),
  linearToSrgb255(c.b),
];

// The crop screen's initial rect for a region. Derived from the fractional
// displayRoi against the current photo — that's the authoritative ROI position
// (a guide-captured `crop` is only a nominal placeholder) — falling back to the
// stored pixel crop for older manual crops.
const cropForRegion = (
  region: CropResult | undefined,
  photo: Photo,
): {top: number; left: number; size: number} | undefined => {
  if (region?.displayRoi && photo.width && photo.height) {
    const roi = region.displayRoi;
    return {
      left: Math.round(roi.x * photo.width),
      top: Math.round(roi.y * photo.height),
      size: Math.round(roi.w * photo.width),
    };
  }
  return region?.crop;
};

// Raw-decoded crop of a DNG region, as a JPEG base64. renderPreview runs the
// native raw pipeline (demosaic / white-balance / colour-matrix → sRGB) rather
// than the camera's ISP preview, so the histogram editor works from real sensor
// colour. Crop by the fractional displayRoi against the (oriented) preview.
const rawRoiCropBase64 = async (
  dngUri: string,
  roi: {x: number; y: number; w: number; h: number},
): Promise<string> => {
  const preview = await DngDecoderHybrid.renderPreview(dngUri, 1024);
  const crop: ActionCrop = {
    crop: {
      originX: Math.round(roi.x * preview.width),
      originY: Math.round(roi.y * preview.height),
      width: Math.round(roi.w * preview.width),
      height: Math.round(roi.h * preview.height),
    },
  };
  const out = await manipulateAsync(preview.uri, [crop], {
    base64: true,
    compress: 1.0,
    format: SaveFormat.JPEG,
  });
  if (!out.base64) {
    throw new Error('rawRoiCropBase64: manipulateAsync returned no base64');
  }
  return out.base64;
};

// Shares the captured image(s) — the JPEG plus the companion DNG when present.
// Only offered for camera captures (picked files the user already has).
const ShareButton = ({photo, dngUri}: {photo: Photo; dngUri?: string}) => {
  const {t} = useTranslation();
  const onShare = useCallback(async () => {
    // DNG first, then JPEG — same order as the working Raw Capture test share.
    const urls = [dngUri, photo.uri].filter((u): u is string => !!u);
    if (urls.length === 0) {
      return;
    }
    try {
      // Omit `type` so the OS infers MIME from each extension (DNG vs JPEG).
      await Share.open({urls, failOnCancel: false});
    } catch (err) {
      console.warn('[combinedColor] share failed', err);
    }
  }, [photo.uri, dngUri]);
  return (
    <ContainedButton
      label={t('colorCamera.combined.share')}
      size="lg"
      stretchToFit={true}
      leftIcon="share"
      onPress={onShare}
    />
  );
};

// Which region the user is actively cropping / editing. 'review' is the normal
// scrolling screen.
type Mode = 'review' | 'crop-ref' | 'crop-soil' | 'edit-ref' | 'edit-soil';
type Which = 'reference' | 'soil';
type Overrides = {reference?: LinearRgb; soil?: LinearRgb};

export type CombinedColorProps = {
  pitProps: SoilPitInputScreenProps;
  // Optional pre-population (e.g. from the preview camera's auto-crop).
  photo?: Photo;
  dngUri?: string;
  initialState?: ColorAnalysisContextState;
  // An already-saved colour for this depth. When present (and no image has been
  // picked yet), the screen shows a results view instead of the entry buttons —
  // the full image / ROIs aren't persisted, so those stay unavailable.
  existingColor?: MunsellColor;
  // Switch the depth to the manual (Enter Values) workflow. Provided by the
  // hosting ColorScreen, which then renders its manual UI.
  onEnterValues?: () => void;
};

/**
 * Prototype "combined" single-screen colour UX. One scrolling screen, entered
 * top-to-bottom: Select Image is pinned at the top; once an image is selected
 * (and its reference/soil regions cropped) the review appears — photo with ROI
 * overlays, soil conditions, reference card, and the pipeline grid (with swap +
 * tap-to-edit). Cropping and the dominant-colour editor take over full-screen.
 * Reuses the existing crop screen, pipeline grid, pickers, and measurement so
 * it shares almost everything with the classic flow; it coexists behind a flag.
 */
export const CombinedColorScreen = ({
  pitProps,
  photo: initialPhoto,
  dngUri: initialDng,
  initialState,
  existingColor,
  onEnterValues,
}: CombinedColorProps) => {
  const {t} = useTranslation();
  const [photo, setPhoto] = useState<Photo | undefined>(initialPhoto);
  const [dngUri, setDngUri] = useState<string | undefined>(initialDng);
  // Whether the current photo came from the camera (vs gallery/file). Only
  // camera captures offer Share — picked files the user already has.
  const [fromCamera, setFromCamera] = useState(!!initialPhoto);
  const [reference, setReference] = useState<CropResult | undefined>(
    initialState?.reference,
  );
  const [soil, setSoil] = useState<CropResult | undefined>(initialState?.soil);
  const [overrides, setOverrides] = useState<Overrides>({});
  // The crop base64 fed to the dominant-colour editor. For a DNG it's the
  // raw-decoded ROI (not the ISP crop); for other formats it's the stored crop.
  const [editSource, setEditSource] = useState<string | null>(null);
  // If we arrive with a photo but no regions (e.g. the guide camera with the
  // guide off), jump straight into the crop flow.
  const [mode, setMode] = useState<Mode>(() =>
    initialPhoto && !initialState?.reference ? 'crop-ref' : 'review',
  );
  const navigation = useNavigation();

  const onUseCamera = useCallback(
    () =>
      navigation.navigate('PREVIEW_CAPTURE', {
        pitProps,
        mode: 'auto',
        destination: 'SOIL_INPUT_soilColor',
        guideControls: true,
        forceRaw: true,
      }),
    [navigation, pitProps],
  );

  // A fresh pick resets the regions and starts the crop flow (reference first,
  // then soil) — same order as the classic UX.
  const onPick = useCallback((picked: Photo, pickedDng?: string) => {
    setPhoto(picked);
    setDngUri(pickedDng);
    setFromCamera(false);
    setReference(undefined);
    setSoil(undefined);
    setOverrides({});
    setMode('crop-ref');
  }, []);

  const onCropRef = useCallback(
    (crop: CropResult) => {
      setReference(crop);
      setMode(soil ? 'review' : 'crop-soil');
    },
    [soil],
  );
  const onCropSoil = useCallback(
    (crop: CropResult) => {
      setSoil(crop);
      setMode(reference ? 'review' : 'crop-ref');
    },
    [reference],
  );

  const onEditDone = useCallback((which: Which, color: LinearRgb) => {
    setOverrides(o => ({...o, [which]: color}));
    setMode('review');
  }, []);

  // Open the dominant-colour editor for a region, preparing its source pixels
  // first: raw-decoded for a DNG, the stored crop otherwise.
  const openEditor = useCallback(
    async (which: Which) => {
      const region = which === 'reference' ? reference : soil;
      if (!region) {
        return;
      }
      let src = region.photo.base64;
      if (dngUri && region.displayRoi) {
        try {
          src = await rawRoiCropBase64(dngUri, region.displayRoi);
        } catch (err) {
          console.warn(
            '[combinedColor] raw ROI crop failed, using display',
            err,
          );
        }
      }
      setEditSource(src);
      setMode(which === 'reference' ? 'edit-ref' : 'edit-soil');
    },
    [reference, soil, dngUri],
  );

  // While editing a colour (a full-screen takeover rendered inside this screen,
  // not a pushed route), intercept back/gesture/hardware-back so it returns to
  // the review rather than popping the whole screen and losing the image.
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', e => {
      const editing = mode === 'edit-ref' || mode === 'edit-soil';
      const cropping = mode === 'crop-ref' || mode === 'crop-soil';
      if (editing || (cropping && reference && soil)) {
        // Editing / re-cropping → back returns to the main screen, keeping the
        // image and regions.
        e.preventDefault();
        setMode('review');
      } else if (cropping) {
        // Backing out of the INITIAL crop flow cancels this image and returns
        // to the entry (Select Image) state, as if freshly arrived.
        e.preventDefault();
        setPhoto(undefined);
        setDngUri(undefined);
        setReference(undefined);
        setSoil(undefined);
        setOverrides({});
        setMode('review');
      }
    });
    return unsub;
  }, [navigation, mode, reference, soil]);

  const onSwap = useCallback(() => {
    setReference(soil);
    setSoil(reference);
    setOverrides(o => ({reference: o.soil, soil: o.reference}));
  }, [reference, soil]);

  // A functional setState for the context provider so any shared child that
  // writes reference/soil (none today, but keeps the contract) stays in sync.
  const setContextState = useCallback(
    (
      updater:
        | ColorAnalysisContextState
        | ((prev: ColorAnalysisContextState) => ColorAnalysisContextState),
    ) => {
      const next =
        typeof updater === 'function' ? updater({reference, soil}) : updater;
      setReference(next.reference);
      setSoil(next.soil);
    },
    [reference, soil],
  );

  // Full-screen takeovers. Distinct keys force a fresh mount per region so the
  // crop/editor state re-initialises (e.g. an un-cropped soil region starts at
  // the full image, not the reference's crop).
  if (photo && mode === 'crop-ref') {
    return (
      <ColorCropScreen
        key="crop-ref"
        photo={photo}
        initialCrop={cropForRegion(reference, photo)}
        onCrop={onCropRef}
        title={t('soil.color.reference')}
        description={t('soil.color.crop_reference')}
        fabLabel={soil ? t('general.save') : t('general.next')}
      />
    );
  }
  if (photo && mode === 'crop-soil') {
    return (
      <ColorCropScreen
        key="crop-soil"
        photo={photo}
        initialCrop={cropForRegion(soil, photo)}
        onCrop={onCropSoil}
        title={t('soil.color.soil')}
        description={t('soil.color.crop_soil')}
        fabLabel={reference ? t('general.save') : t('general.next')}
      />
    );
  }
  if (photo && mode === 'edit-ref' && reference) {
    return (
      <DominantColorEditor
        key="edit-ref"
        title={t('soil.color.reference')}
        sourceBase64={editSource ?? reference.photo.base64}
        onDone={c => onEditDone('reference', c)}
      />
    );
  }
  if (photo && mode === 'edit-soil' && soil) {
    return (
      <DominantColorEditor
        key="edit-soil"
        title={t('soil.color.soil')}
        sourceBase64={editSource ?? soil.photo.base64}
        onDone={c => onEditDone('soil', c)}
      />
    );
  }

  const selectButton = (
    <ImagePicker
      onPick={onPick}
      featureName={t('soil.color.title')}
      onUseCameraOverride={onUseCamera}>
      {onOpen => (
        <ContainedButton
          label={t('colorCamera.combined.select_image')}
          size="lg"
          stretchToFit={true}
          leftIcon="add-a-photo"
          onPress={onOpen}
        />
      )}
    </ImagePicker>
  );

  const enterManuallyButton = onEnterValues ? (
    <ContainedButton
      label={t('colorCamera.combined.enter_manually')}
      size="lg"
      stretchToFit={true}
      leftIcon="edit"
      onPress={onEnterValues}
    />
  ) : null;

  // No image picked yet: a results view (a colour already exists — only the
  // result + conditions are shown, since the image/ROIs aren't persisted) or
  // the flat entry menu (Manual Entry / Automatic Entry).
  if (!photo || !reference || !soil) {
    return (
      <ScreenScaffold
        AppBar={<AppBar title={t('colorCamera.combined.title')} />}>
        <SafeScrollViewWithFab>
          <Column padding="md" space="md">
            {!photo && !existingColor && (
              <>
                <Heading variant="h6">
                  {t('colorCamera.combined.manual_entry')}
                </Heading>
                {onEnterValues && (
                  <ContainedButton
                    label={t('colorCamera.combined.enter_values')}
                    size="lg"
                    stretchToFit={true}
                    onPress={onEnterValues}
                  />
                )}
                <Heading variant="h6">
                  {t('colorCamera.combined.automatic_entry')}
                </Heading>
                <ImagePicker
                  inline
                  onPick={onPick}
                  featureName={t('soil.color.title')}
                  onUseCameraOverride={onUseCamera}
                />
              </>
            )}
            {!photo && existingColor && (
              <>
                {selectButton}
                {enterManuallyButton}
                <PhotoConditions {...pitProps} />
                <ReferenceColorPicker />
                <Column alignItems="center" space="sm">
                  <Text variant="body1-strong">
                    {t('colorCamera.combined.result')}
                  </Text>
                  <ColorDisplay variant="lg" color={existingColor} />
                </Column>
              </>
            )}
            {photo && (
              <Text variant="body2">{t('colorCamera.combined.cropping')}</Text>
            )}
          </Column>
        </SafeScrollViewWithFab>
        {existingColor && (
          <Fab
            label={t('general.done')}
            leftIcon="check"
            onPress={() => navigation.pop()}
          />
        )}
      </ScreenScaffold>
    );
  }

  return (
    <ColorAnalysisContext.Provider
      value={{
        photo,
        pitProps,
        dngUri,
        state: {reference, soil},
        setState: setContextState,
      }}>
      <CombinedReview
        photo={photo}
        reference={reference}
        soil={soil}
        overrides={overrides}
        pitProps={pitProps}
        title={t('colorCamera.combined.title')}
        selectButton={selectButton}
        enterManuallyButton={enterManuallyButton}
        shareButton={
          fromCamera ? <ShareButton photo={photo} dngUri={dngUri} /> : null
        }
        onEdit={openEditor}
        onReCrop={which =>
          setMode(which === 'reference' ? 'crop-ref' : 'crop-soil')
        }
        onSwap={onSwap}
      />
    </ColorAnalysisContext.Provider>
  );
};

type ReviewProps = {
  photo: Photo;
  reference: CropResult;
  soil: CropResult;
  overrides: Overrides;
  pitProps: SoilPitInputScreenProps;
  title: string;
  selectButton: React.ReactNode;
  enterManuallyButton: React.ReactNode;
  shareButton: React.ReactNode;
  onEdit: (which: Which) => void;
  onReCrop: (which: Which) => void;
  onSwap: () => void;
};

const CombinedReview = ({
  photo,
  reference,
  soil,
  overrides,
  pitProps,
  title,
  selectButton,
  enterManuallyButton,
  shareButton,
  onEdit,
  onReCrop,
  onSwap,
}: ReviewProps) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const {reference: selectedRef} = useSelectedReference();
  const {measured, colorResult, loading, error} = useColorPipeline(overrides);

  const displayColor: MunsellColor | undefined = colorResult
    ? 'result' in colorResult
      ? colorResult.result
      : colorResult.invalidResult
    : undefined;

  const refExpectedCss = selectedRef
    ? cssRgb(toRgb255(selectedRef.expected))
    : undefined;

  const soilCorrectedCss = useMemo<string | undefined>(() => {
    if (!measured?.predicted) {
      return undefined;
    }
    const chip = munsellToRGB({
      colorHue: measured.predicted[0],
      colorValue: measured.predicted[1],
      colorChroma: measured.predicted[2],
    });
    return chip ? cssRgb([chip[0], chip[1], chip[2]] as Rgb255) : undefined;
  }, [measured?.predicted]);

  const referenceColumn: PipelineColumn = {
    heading: t('soil.color.reference'),
    cropBase64: reference.photo.base64,
    measuredRgb: measured?.referenceRgb,
    finalCss: refExpectedCss,
    finalLabel: t('colorCamera.info.refCard'),
  };
  const soilColumn: PipelineColumn = {
    heading: t('soil.color.soil'),
    cropBase64: soil.photo.base64,
    measuredRgb: measured?.soilRgb,
    finalCss: soilCorrectedCss,
    finalLabel: t('colorCamera.info.resultChip'),
  };

  const onSave = useMemo(() => {
    if (!colorResult) {
      return undefined;
    }
    const color: MunsellColor =
      'result' in colorResult ? colorResult.result : colorResult.invalidResult;
    return () => {
      dispatch(
        updateDepthDependentSoilData({
          siteId: pitProps.siteId,
          depthInterval: pitProps.depthInterval.depthInterval,
          ...color,
          colorPhotoUsed: true,
        }),
      );
      trackSoilObservation({
        input_type: 'soil_color',
        input_method: 'photo',
        site_id: pitProps.siteId,
        depthInterval: pitProps.depthInterval.depthInterval,
      });
      // This screen IS the color-feature route's content (embedded by
      // ColorScreen), so a single pop returns to the depth's soil data.
      navigation.pop();
    };
  }, [colorResult, dispatch, navigation, pitProps]);

  return (
    <ScreenScaffold AppBar={<AppBar title={title} />}>
      <SafeScrollViewWithFab>
        <Column padding="md" space="md">
          {selectButton}
          {enterManuallyButton}

          <PhotoWithRois
            photo={photo}
            reference={reference}
            soil={soil}
            onReCrop={onReCrop}
          />

          {shareButton}

          <PhotoConditions {...pitProps} />
          <ReferenceColorPicker />

          <ColorPipelineGrid
            reference={referenceColumn}
            soil={soilColumn}
            onSelectColor={onEdit}
            onSelectPhoto={onReCrop}
            onSwap={onSwap}
          />

          {loading && (
            <Text variant="body2" italic textAlign="center">
              {t('colorCamera.combined.measuring')}
            </Text>
          )}
          {error && (
            <Text variant="body2" color="error.main" textAlign="center">
              {t('colorCamera.combined.measure_failed')}
            </Text>
          )}
          {displayColor && (
            <Column alignItems="center" space="sm">
              <Text variant="body1-strong">
                {t('colorCamera.combined.result')}
              </Text>
              <ColorDisplay variant="md" color={displayColor} />
            </Column>
          )}
        </Column>
      </SafeScrollViewWithFab>
      <Fab
        label={t('general.save')}
        leftIcon="check"
        disabled={!onSave}
        onPress={onSave}
      />
    </ScreenScaffold>
  );
};

// Photo preview with the reference/soil crop rectangles overlaid. Percentage
// positioned inside an aspect-correct box (prototype-grade; the classic home
// screen does pixel-exact letterbox math).
const PhotoWithRois = ({
  photo,
  reference,
  soil,
  onReCrop,
}: {
  photo: Photo;
  reference: CropResult;
  soil: CropResult;
  onReCrop: (which: Which) => void;
}) => {
  const {t} = useTranslation();
  const aspect =
    photo.width && photo.height ? photo.width / photo.height : 3 / 4;
  const boxStyle = [styles.photoBox, {aspectRatio: aspect}];
  return (
    <Box
      width="100%"
      style={boxStyle}
      alignSelf="center"
      backgroundColor="#D9D9D9">
      <Image source={photo} resizeMode="contain" style={styles.photo} />
      {reference.displayRoi && (
        <RoiRect
          roi={reference.displayRoi}
          color="#22ee22"
          label={t('soil.color.reference')}
          onPress={() => onReCrop('reference')}
        />
      )}
      {soil.displayRoi && (
        <RoiRect
          roi={soil.displayRoi}
          color="#ee6622"
          label={t('soil.color.soil')}
          onPress={() => onReCrop('soil')}
        />
      )}
    </Box>
  );
};

const RoiRect = ({
  roi,
  color,
  label,
  onPress,
}: {
  roi: {x: number; y: number; w: number; h: number};
  color: string;
  label: string;
  onPress: () => void;
}) => {
  const rectStyle = [
    styles.roiRect,
    {
      left: `${roi.x * 100}%` as const,
      top: `${roi.y * 100}%` as const,
      width: `${roi.w * 100}%` as const,
      height: `${roi.h * 100}%` as const,
      borderColor: color,
    },
  ];
  const labelStyle = [
    styles.roiLabel,
    {
      left: `${roi.x * 100}%` as const,
      top: `${Math.max(0, roi.y * 100 - 6)}%` as const,
      backgroundColor: color,
    },
  ];
  return (
    <>
      <Pressable onPress={onPress} style={rectStyle} />
      <RNView pointerEvents="none" style={labelStyle}>
        <RNText style={styles.roiLabelText}>{label}</RNText>
      </RNView>
    </>
  );
};

const styles = StyleSheet.create({
  photo: {width: '100%', height: '100%'},
  photoBox: {maxHeight: 320},
  roiRect: {position: 'absolute', borderWidth: 2},
  roiLabel: {position: 'absolute', paddingHorizontal: 4, paddingVertical: 1},
  roiLabelText: {color: '#fff', fontSize: 11, fontWeight: '600'},
});
