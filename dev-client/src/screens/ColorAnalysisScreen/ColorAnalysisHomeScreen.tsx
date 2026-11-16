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
import {Image, Pressable, StyleSheet} from 'react-native';

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
import {getColorFromImages} from 'terraso-mobile-client/model/color/colorDetection';
import {
  ColorResult,
  InvalidColorResult,
  MunsellColor,
} from 'terraso-mobile-client/model/color/types';
import {useSelectedReference} from 'terraso-mobile-client/model/rawColor/referenceColorSelection';
import {soilImageQueue} from 'terraso-mobile-client/model/rawColor/soilImageQueue.default';
import {updateDepthDependentSoilData} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {useColorAnalysisContext} from 'terraso-mobile-client/screens/ColorAnalysisScreen/context/colorAnalysisContext';
import {useColorAnalysisNavigation} from 'terraso-mobile-client/screens/ColorAnalysisScreen/navigation/navigation';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {ColorDisplay} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/components/ColorDisplay';
import {PhotoConditions} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/components/PhotoConditions';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

export const ColorAnalysisHomeScreen = () => {
  const {
    pitProps,
    photo,
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
      soilImageQueue
        .enqueue({
          siteId,
          siteName,
          depth: depthInterval,
          // The current (non-RAW) flow has just a JPEG from expo-image-picker.
          // Once the RAW capture pipeline is routed through this screen (new
          // Preview UX), a second file with kind:'raw' will be added here.
          files: [
            {
              kind: 'jpeg',
              uri: photoUri,
              contentType: 'image/jpeg',
            },
          ],
        })
        .catch(err => {
          console.warn('[soilImageQueue] enqueue failed', err);
        });
    };
  }, [siteId, siteName, depthInterval, photoUri]);

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
  // reference changes. Returns the full ColorResult so the Save path can
  // branch on valid vs invalid without recomputing. Null means the inputs
  // aren't all there yet (missing crop / no reference picked). Any decode
  // failure sets `errored` so the UI can surface the error dialog on Save.
  const [errored, setErrored] = useState(false);
  const liveColor: ColorResult | null = useMemo(() => {
    if (!reference || !soil || !selectedRef) {
      return null;
    }
    try {
      const result = getColorFromImages({
        reference: reference.photo,
        soil: soil.photo,
        referenceColor: selectedRef,
      });
      setErrored(false);
      return result;
    } catch {
      setErrored(true);
      return null;
    }
  }, [reference, soil, selectedRef]);

  const displayColor: MunsellColor | undefined =
    liveColor === null
      ? undefined
      : 'result' in liveColor
        ? liveColor.result
        : liveColor.invalidResult;
  const liveIsInvalid = liveColor !== null && !('result' in liveColor);

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
          <Box
            backgroundColor="#D9D9D9"
            borderWidth="2px"
            width="100%"
            height="180px">
            <Image source={photo} resizeMode="cover" style={styles.image} />
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
