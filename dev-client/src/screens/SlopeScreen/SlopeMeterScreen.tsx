/*
 * Copyright © 2023 Technology Matters
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

import {useCallback, useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';

import {CameraView, useCameraPermissions} from 'expo-camera';
import * as ScreenOrientation from 'expo-screen-orientation';
import {DeviceMotion} from 'expo-sensors';

import {trackSoilObservation} from 'terraso-mobile-client/analytics/soilObservationTracking';
import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {BigCloseButton} from 'terraso-mobile-client/components/buttons/icons/common/BigCloseButton';
import {InfoButton} from 'terraso-mobile-client/components/buttons/icons/common/InfoButton';
import {SlopeMeterButton} from 'terraso-mobile-client/components/buttons/special/SlopeMeterButton';
import {HelpContentSpacer} from 'terraso-mobile-client/components/content/HelpContentSpacer';
import {TranslatedHeading} from 'terraso-mobile-client/components/content/typography/TranslatedHeading';
import {useNavToBottomTabsAndShowSyncError} from 'terraso-mobile-client/components/dataRequirements/handleMissingData';
import {
  ScreenDataRequirements,
  useMemoizedRequirements,
} from 'terraso-mobile-client/components/dataRequirements/ScreenDataRequirements';
import {PermissionsRequestWrapper} from 'terraso-mobile-client/components/modals/PermissionsRequestWrapper';
import {
  Box,
  Column,
  Heading,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {updateSoilData} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {SlopeMeterInfoContent} from 'terraso-mobile-client/screens/SlopeScreen/components/SlopeMeterInfoContent';
import {degreeToPercent} from 'terraso-mobile-client/screens/SlopeScreen/utils/steepnessConversion';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {selectSite} from 'terraso-mobile-client/store/selectors';

const toDegrees = (rad: number) => Math.round(Math.abs((rad * 180) / Math.PI));

export const SlopeMeterScreen = ({siteId}: {siteId: string}) => {
  const {t} = useTranslation();
  const [permission, _, getCameraPermissionAsync] = useCameraPermissions();
  const [deviceTiltDeg, setDeviceTiltDeg] = useState<number | null>(null);
  const navigation = useNavigation();
  const dispatch = useDispatch();

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, []);

  useEffect(() => {
    DeviceMotion.setUpdateInterval(300);
    return DeviceMotion.addListener(motion => {
      if (
        motion?.rotation?.beta !== undefined &&
        !isNaN(motion?.rotation?.beta)
      ) {
        setDeviceTiltDeg(toDegrees(motion.rotation.beta));
      }
    }).remove;
  }, []);

  const onClose = useCallback(() => navigation.pop(), [navigation]);
  const onUse = useCallback(async () => {
    if (deviceTiltDeg === null) {
      return;
    }
    await dispatch(
      updateSoilData({
        siteId,
        slopeSteepnessSelect: null,
        slopeSteepnessPercent: null,
        slopeSteepnessDegree: deviceTiltDeg,
      }),
    );
    trackSoilObservation({
      input_type: 'slope_steepness',
      input_method: 'clinometer',
      site_id: siteId,
    });
    navigation.pop();
  }, [dispatch, siteId, deviceTiltDeg, navigation]);

  const site = useSelector(selectSite(siteId));
  const handleMissingSite = useNavToBottomTabsAndShowSyncError();
  const requirements = useMemoizedRequirements([
    {data: site, doIfMissing: handleMissingSite},
  ]);

  return (
    <ScreenDataRequirements requirements={requirements}>
      {() => (
        <ScreenScaffold AppBar={null} BottomNavigation={null}>
          <Row flex={1} alignItems="stretch" px="24px" py="20px">
            <Box flex={1} justifyContent="center">
              {permission?.granted ? (
                <Box flex={1} position="relative">
                  <CameraView style={styles.camera} />
                  <Column
                    position="absolute"
                    top={0}
                    left={0}
                    right={0}
                    bottom={0}
                    flex={1}
                    alignItems="stretch"
                    pointerEvents="none">
                    <Box flex={1} />
                    <Box height="3px" bg="text.primary" />
                    <Box height="3px" bg="primary.contrast" />
                    <Box flex={1} bg="#00000080" />
                  </Column>
                </Box>
              ) : (
                <PermissionsRequestWrapper
                  requestModalTitle={t('permissions.camera_title')}
                  requestModalBody={t('permissions.camera_body', {
                    feature: t('slope.steepness.slope_meter'),
                  })}
                  permissionHook={useCameraPermissions}
                  permissionedAction={getCameraPermissionAsync}>
                  {onRequest => (
                    <ContainedButton
                      size="lg"
                      stretchToFit
                      onPress={onRequest}
                      label={t('slope.steepness.camera_grant')}
                    />
                  )}
                </PermissionsRequestWrapper>
              )}
            </Box>
            <Column alignItems="center">
              <Box {...styles.closeButtonBox}>
                <BigCloseButton onPress={onClose} />
              </Box>
              <Column
                px="56px"
                flex={1}
                justifyContent="center"
                alignItems="center">
                <Row alignItems="center">
                  <Heading variant="h6">
                    {t('slope.steepness.slope_meter')}
                  </Heading>
                  <HelpContentSpacer />
                  <InfoButton
                    sheetHeading={
                      <TranslatedHeading i18nKey="slope.steepness.info.title" />
                    }>
                    <SlopeMeterInfoContent />
                  </InfoButton>
                </Row>
                <Box height="12px" />
                <Heading variant="h5" fontWeight={700}>
                  {deviceTiltDeg !== null && `${deviceTiltDeg}°`}
                </Heading>
                <Box height="5px" />
                <Heading variant="h6">
                  {deviceTiltDeg !== null &&
                    `${degreeToPercent(deviceTiltDeg)}%`}
                </Heading>
                <Box height="18px" />
                <SlopeMeterButton onPress={onUse} />
              </Column>
            </Column>
          </Row>
        </ScreenScaffold>
      )}
    </ScreenDataRequirements>
  );
};

const styles = {
  camera: {flex: 1},
  closeButtonBox: {
    position: 'relative',
    top: 0,
    right: 0,
    padding: 0,
    alignSelf: 'flex-end',
  },
} as const;
