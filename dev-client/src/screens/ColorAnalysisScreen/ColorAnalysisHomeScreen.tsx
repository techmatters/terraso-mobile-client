/*
 * Copyright © 2024 Technology Matters
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
import {useTranslation} from 'react-i18next';
import {
  Image,
  LayoutChangeEvent,
  Pressable,
  Text as RNText,
  View as RNView,
  StyleSheet,
} from 'react-native';

import {trackSoilObservation} from 'terraso-mobile-client/analytics/soilObservationTracking';
import {DialogButton} from 'terraso-mobile-client/components/buttons/DialogButton';
import {Fab} from 'terraso-mobile-client/components/buttons/Fab';
import {IconButton} from 'terraso-mobile-client/components/buttons/icons/IconButton';
import {ErrorDialog} from 'terraso-mobile-client/components/dialogs/ErrorDialog';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {ReferenceColorPicker} from 'terraso-mobile-client/components/inputs/ReferenceColorPicker';
import {ActionsModal} from 'terraso-mobile-client/components/modals/ActionsModal';
import {ModalHandle} from 'terraso-mobile-client/components/modals/Modal';
import {
  Box,
  Column,
  Row,
  Text,
  View,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {SafeScrollViewWithFab} from 'terraso-mobile-client/components/safeview/SafeScrollViewWithFab';
import {getColorFromJpegCrops} from 'terraso-mobile-client/model/color/colorDetection';
import {getColorFromDng} from 'terraso-mobile-client/model/color/dngColorAnalysis';
import {
  ColorResult,
  InvalidColorResult,
  MunsellColor,
} from 'terraso-mobile-client/model/color/types';
import {useSelectedReference} from 'terraso-mobile-client/model/rawColor/referenceColorSelection';
import type {SoilImageFile} from 'terraso-mobile-client/model/rawColor/soilImageQueue';
import {soilImageQueue} from 'terraso-mobile-client/model/rawColor/soilImageQueue.default';
import {updateDepthDependentSoilData} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {useColorAnalysisContext} from 'terraso-mobile-client/screens/ColorAnalysisScreen/context/colorAnalysisContext';
import {useColorAnalysisNavigation} from 'terraso-mobile-client/screens/ColorAnalysisScreen/navigation/navigation';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {ColorDisplay} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/components/ColorDisplay';
import {PhotoConditions} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/components/PhotoConditions';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

// Rect within the container where the Image actually paints, accounting
// for resizeMode="contain" letterboxing. Mirrors RN's internal math.
const imageRectInContainer = (
  containerW: number,
  containerH: number,
  photoW: number,
  photoH: number,
): {left: number; top: number; width: number; height: number} => {
  const photoAspect = photoW / photoH;
  const containerAspect = containerW / containerH;
  if (photoAspect > containerAspect) {
    // Image is wider than container (relatively) → fills horizontally,
    // letterboxed top/bottom.
    const w = containerW;
    const h = w / photoAspect;
    return {left: 0, top: (containerH - h) / 2, width: w, height: h};
  }
  const h = containerH;
  const w = h * photoAspect;
  return {left: (containerW - w) / 2, top: 0, width: w, height: h};
};

// Labelled rectangle overlaid on the photo preview to show which region was
// used for the reference / soil crop. Positioned in absolute pixel coords
// (computed from the measured image rect) rather than percentages — the
// outer Box can be wider than the image when maxHeight clamps, so
// percentages would place the rect over the gray letterbox bars.
const RoiOverlay = ({
  rect,
  roi,
  label,
  color,
}: {
  rect: {left: number; top: number; width: number; height: number};
  roi: {x: number; y: number; w: number; h: number};
  label: string;
  color: string;
}) => {
  const box = {
    left: rect.left + roi.x * rect.width,
    top: rect.top + roi.y * rect.height,
    width: roi.w * rect.width,
    height: roi.h * rect.height,
  };
  return (
    <>
      <RNView
        pointerEvents="none"
        style={[
          overlayStyles.rect,
          {
            left: box.left,
            top: box.top,
            width: box.width,
            height: box.height,
            borderColor: color,
          },
        ]}
      />
      <RNView
        pointerEvents="none"
        style={[
          overlayStyles.label,
          {
            left: box.left,
            top: Math.max(0, box.top - 18),
            backgroundColor: color,
          },
        ]}>
        <RNText style={overlayStyles.labelText}>{label}</RNText>
      </RNView>
    </>
  );
};

const overlayStyles = StyleSheet.create({
  rect: {
    position: 'absolute',
    borderWidth: 2,
  },
  label: {
    position: 'absolute',
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  labelText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
});

export const ColorAnalysisHomeScreen = () => {
  const {
    pitProps,
    photo,
    dngUri,
    state: {reference, soil},
  } = useColorAnalysisContext();
  const navigation = useNavigation();
  const colorAnalysisNavigation = useColorAnalysisNavigation();
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const modalRef = useRef<ModalHandle>(null);
  const errorDialogRef = useRef<ModalHandle>(null);
  const [colorResult, setColorResult] = useState<InvalidColorResult | null>(
    null,
  );
  const siteName = useSelector(
    state => state.site.sites[pitProps.siteId]?.name ?? pitProps.siteId,
  );
  const {reference: selectedRef} = useSelectedReference();

  // Queue the captured photo for upload when the user leaves this screen,
  // in either direction (back / cancel / navigate forward). Dedup by
  // (siteId, depth) is handled by the queue — a re-capture for the same slot
  // replaces the previous entry and deletes its file (color-final-plan.md
  // "keep the latest"). Only queues once per screen instance; Save also
  // leaves the screen, so the photo still gets queued on that path.
  const enqueuedRef = useRef(false);
  const {siteId} = pitProps;
  const {depthInterval} = pitProps.depthInterval;
  const photoUri = photo.uri;
  useEffect(() => {
    return () => {
      if (enqueuedRef.current) {
        return;
      }
      enqueuedRef.current = true;
      // New Preview UX supplies both a JPEG and a DNG on RAW-capable devices
      // (jpeg-only when simulating no-RAW); the old pick-image flow only
      // ever produces a JPEG. Build the files array from whatever's present.
      const files: SoilImageFile[] = [
        {kind: 'jpeg', uri: photoUri, contentType: 'image/jpeg'},
      ];
      if (dngUri) {
        files.push({
          kind: 'raw',
          uri: dngUri,
          contentType: 'image/x-adobe-dng',
        });
      }
      soilImageQueue
        .enqueue({siteId, siteName, depth: depthInterval, files})
        .catch(err => {
          console.warn('[soilImageQueue] enqueue failed', err);
        });
    };
  }, [siteId, siteName, depthInterval, photoUri, dngUri]);

  const dispatchColor = useCallback(
    (color: MunsellColor) => {
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
      navigation.pop();
    },
    [dispatch, pitProps, navigation],
  );

  // Live colour computation — runs whenever either crop OR the chosen
  // reference changes. Stores the full ColorResult so the Save path can branch
  // on valid vs invalid without recomputing. Null means the inputs aren't all
  // there yet (missing crop / no reference picked) OR a decode failed; a
  // failure also sets `errored` so the UI can surface the error dialog on Save.
  //
  // Unified analysis, one correction + Munsell step in linear space:
  //   - DNG present → decode the reference/soil crop rects straight from raw
  //     sensor pixels (true linear, native white-balance + colour matrix).
  //   - otherwise (JPEG/HEIC/PNG) → dominant colour of each 8-bit crop, lifted
  //     to linear. The DNG branch is async (native decode), so this runs in an
  //     effect rather than a synchronous memo.
  const [errored, setErrored] = useState(false);
  const [liveColor, setLiveColor] = useState<ColorResult | null>(null);
  useEffect(() => {
    if (!reference || !soil || !selectedRef) {
      setLiveColor(null);
      setErrored(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const result =
          dngUri && reference.displayRoi && soil.displayRoi
            ? await getColorFromDng({
                dngUri,
                referenceRoi: reference.displayRoi,
                soilRoi: soil.displayRoi,
                expected: selectedRef.expected,
              })
            : getColorFromJpegCrops({
                reference: reference.photo,
                soil: soil.photo,
                expected: selectedRef.expected,
              });
        if (!cancelled) {
          setLiveColor(result);
          setErrored(false);
        }
      } catch {
        if (!cancelled) {
          setLiveColor(null);
          setErrored(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reference, soil, selectedRef, dngUri]);

  const displayColor: MunsellColor | undefined =
    liveColor === null
      ? undefined
      : 'result' in liveColor
        ? liveColor.result
        : liveColor.invalidResult;
  const liveIsInvalid = liveColor !== null && !('result' in liveColor);

  // Memoised so the Box's style identity is stable per photo — avoids a
  // re-layout on every render and keeps eslint's no-inline-styles happy
  // for the dynamic aspectRatio value (static maxHeight pairs with it).
  const photoBoxStyle = useMemo(
    () => ({
      aspectRatio:
        photo.width && photo.height ? photo.width / photo.height : 4 / 3,
      maxHeight: 320,
    }),
    [photo.width, photo.height],
  );

  // Measured photo-container size (from onLayout) + computed image rect
  // inside it. Used to position the ROI overlays exactly over the image
  // pixels — percentages would misalign when the container is wider than
  // the image (maxHeight clamp on a portrait photo).
  const [photoBoxSize, setPhotoBoxSize] = useState<{
    w: number;
    h: number;
  } | null>(null);
  const onPhotoBoxLayout = useCallback((e: LayoutChangeEvent) => {
    const {width, height} = e.nativeEvent.layout;
    setPhotoBoxSize(prev =>
      prev && prev.w === width && prev.h === height
        ? prev
        : {w: width, h: height},
    );
  }, []);
  const imageRect = useMemo(() => {
    if (!photoBoxSize || !photo.width || !photo.height) {
      return null;
    }
    return imageRectInContainer(
      photoBoxSize.w,
      photoBoxSize.h,
      photo.width,
      photo.height,
    );
  }, [photoBoxSize, photo.width, photo.height]);

  const onSave = useMemo(() => {
    if (liveColor === null) {
      return null;
    }
    return () => {
      if (errored) {
        errorDialogRef.current?.onOpen();
        return;
      }
      if ('result' in liveColor) {
        dispatchColor(liveColor.result);
      } else {
        setColorResult(liveColor);
        modalRef.current?.onOpen();
      }
    };
  }, [liveColor, errored, dispatchColor]);

  const onReference = useCallback(() => {
    colorAnalysisNavigation.navigate('COLOR_CROP_REFERENCE');
  }, [colorAnalysisNavigation]);

  const onSoil = useCallback(() => {
    colorAnalysisNavigation.navigate('COLOR_CROP_SOIL');
  }, [colorAnalysisNavigation]);

  const onInfo = useCallback(() => {
    colorAnalysisNavigation.navigate('COLOR_ANALYSIS_INFO');
  }, [colorAnalysisNavigation]);

  const unexpectedColorActions = useMemo(
    () =>
      colorResult && (
        <>
          <DialogButton
            type="outlined"
            onPress={() => dispatchColor(colorResult!.nearestValidResult)}
            label={t('soil.color.unexpected_color.use_suggestion')}
          />
          <DialogButton
            onPress={() => dispatchColor(colorResult!.invalidResult)}
            label={t('general.proceed')}
          />
        </>
      ),
    [dispatchColor, colorResult, t],
  );

  return (
    <ScreenScaffold>
      <SafeScrollViewWithFab>
        <Column padding="xl">
          {/* Photo container is sized to the photo's own aspect ratio (so a
              portrait 3:4 JPEG renders portrait, not cropped to a landscape
              slice) and capped at 320px tall so a portrait phone doesn't lose
              everything below the fold. resizeMode="contain" preserves aspect
              exactly — any extra space shows the gray placeholder bg.

              The crop-region overlays are drawn via onLayout coordinates
              (not percentages) because the Box may be wider than the image
              when maxHeight clamps — percentage positioning would place the
              overlays over the letterbox gray bars, not the image. */}
          <Box
            backgroundColor="#D9D9D9"
            borderWidth="2px"
            width="100%"
            style={photoBoxStyle}
            alignSelf="center"
            onLayout={onPhotoBoxLayout}>
            <Image source={photo} resizeMode="contain" style={styles.image} />
            {reference?.displayRoi && imageRect && (
              <RoiOverlay
                rect={imageRect}
                roi={reference.displayRoi}
                label={t('soil.color.reference')}
                color="#22ee22"
              />
            )}
            {soil?.displayRoi && imageRect && (
              <RoiOverlay
                rect={imageRect}
                roi={soil.displayRoi}
                label={t('soil.color.soil')}
                color="#ee6622"
              />
            )}
            <View position="absolute" top="-18px" right="-18px">
              <IconButton
                name="delete"
                type="md"
                variant="normal-filled"
                onPress={() => navigation.pop()}
              />
            </View>
          </Box>
          <Box height="md" />
          <ReferenceColorPicker />
          <Box height="md" />
          <Row justifyContent="space-between">
            {(
              [
                ['reference', onReference, reference?.photo],
                ['soil', onSoil, soil?.photo],
              ] as const
            ).map(([key, onPress, croppedPhoto]) => (
              <Column key={key} alignItems="flex-start">
                <Text variant="body1-strong">{t(`soil.color.${key}`)}</Text>
                <Box height="sm" />
                <Pressable onPress={onPress}>
                  <Box
                    width="100px"
                    height="100px"
                    backgroundColor="grey.300"
                    overflow="hidden">
                    {croppedPhoto ? (
                      <Image source={croppedPhoto} style={styles.image} />
                    ) : (
                      <Box
                        width="100%"
                        height="100%"
                        justifyContent="center"
                        alignItems="center">
                        <Icon name="touch-app" color="action.active" />
                      </Box>
                    )}
                  </Box>
                </Pressable>
              </Column>
            ))}
          </Row>
          {/* Live Munsell result + Info button + swatch. Shown only once
              both crops AND a reference are selected. Recomputes whenever
              the reference dropdown changes. */}
          {displayColor && (
            <>
              <Box height="lg" />
              <Row alignItems="center" space="sm">
                <ColorDisplay variant="md" color={displayColor} />
                <IconButton
                  name="info-outline"
                  type="md"
                  variant="normal"
                  accessibilityLabel={t('colorCamera.info.title')}
                  onPress={onInfo}
                />
              </Row>
              {liveIsInvalid && (
                <>
                  <Box height="sm" />
                  <Row alignItems="center" space="sm">
                    <Icon name="warning" color="warning.main" />
                    <Text variant="body2" color="warning.main" flex={1}>
                      {t('soil.color.inline_warning')}
                    </Text>
                  </Row>
                </>
              )}
            </>
          )}
        </Column>
        {pitProps && <PhotoConditions {...pitProps} />}
      </SafeScrollViewWithFab>
      <ActionsModal
        title={t('soil.color.unexpected_color.title')}
        ref={modalRef}
        actions={unexpectedColorActions}>
        <Text>{t('soil.color.unexpected_color.body')}</Text>
        <Box height="md" />
        {colorResult && (
          <Row justifyContent="space-around" alignSelf="stretch">
            <Column alignItems="center">
              <ColorDisplay
                variant="md"
                color={colorResult.nearestValidResult}
              />
              <Box height="sm" />
              <Text>{t('soil.color.unexpected_color.suggestion')}</Text>
            </Column>
            <Column alignItems="center">
              <ColorDisplay variant="md" color={colorResult.invalidResult} />
              <Box height="sm" />
              <Text>{t('soil.color.unexpected_color.your_result')}</Text>
            </Column>
          </Row>
        )}
      </ActionsModal>
      <ErrorDialog
        ref={errorDialogRef}
        headline={t('soil.color.analysis_error.headline')}
        supportUrl="https://landpotential.org/support/">
        {t('soil.color.analysis_error.body')}
      </ErrorDialog>
      <Fab
        label={t('general.save')}
        disabled={onSave === null}
        onPress={onSave ?? undefined}
        leftIcon="check"
      />
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  image: {width: '100%', height: '100%'},
});
