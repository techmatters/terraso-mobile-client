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

import {useCallback, useMemo, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Image, Pressable, StyleSheet} from 'react-native';

import {trackSoilObservation} from 'terraso-mobile-client/analytics/soilObservationTracking';
import {DialogButton} from 'terraso-mobile-client/components/buttons/DialogButton';
import {Fab} from 'terraso-mobile-client/components/buttons/Fab';
import {IconButton} from 'terraso-mobile-client/components/buttons/icons/IconButton';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
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
  InvalidColorResult,
  MunsellColor,
} from 'terraso-mobile-client/model/color/types';
import {updateDepthDependentSoilData} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {useColorAnalysisContext} from 'terraso-mobile-client/screens/ColorAnalysisScreen/context/colorAnalysisContext';
import {useColorAnalysisNavigation} from 'terraso-mobile-client/screens/ColorAnalysisScreen/navigation/navigation';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {ColorDisplay} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/components/ColorDisplay';
import {PhotoConditions} from 'terraso-mobile-client/screens/SoilScreen/ColorScreen/components/PhotoConditions';
import {useDispatch} from 'terraso-mobile-client/store';

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
  const [colorResult, setColorResult] = useState<InvalidColorResult | null>(
    null,
  );

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

  const onAnalyze = useMemo(() => {
    if (!reference || !soil) {
      return null;
    }

    return () => {
      const color = getColorFromImages({
        reference: reference.photo,
        soil: soil.photo,
      });

      if ('result' in color) {
        dispatchColor(color.result);
      } else {
        modalRef.current?.onOpen();
        setColorResult(color);
      }
    };
  }, [reference, soil, dispatchColor]);

  const onReference = useCallback(() => {
    colorAnalysisNavigation.navigate('COLOR_CROP_REFERENCE');
  }, [colorAnalysisNavigation]);

  const onSoil = useCallback(() => {
    colorAnalysisNavigation.navigate('COLOR_CROP_SOIL');
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
          <Box height="lg" />
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
      <Fab
        label={t('soil.color.analyze')}
        disabled={onAnalyze === null}
        onPress={onAnalyze}
        leftIcon="check"
      />
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  image: {width: '100%', height: '100%'},
});
