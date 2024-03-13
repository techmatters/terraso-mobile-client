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
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import * as ScreenOrientation from 'expo-screen-orientation';
import {Camera} from 'expo-camera';
import {DeviceMotion} from 'expo-sensors';
import {Button, Link} from 'native-base';
import {CardCloseButton} from 'terraso-mobile-client/components/CardCloseButton';
import {useTranslation} from 'react-i18next';
import {Icon, IconButton} from 'terraso-mobile-client/components/Icons';
import {degreeToPercent} from 'terraso-mobile-client/screens/SlopeScreen/utils/steepnessConversion';
import {Linking} from 'react-native';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {useDispatch} from 'terraso-mobile-client/store';
import {updateSoilData} from 'terraso-client-shared/soilId/soilIdSlice';
import {
  Box,
  Column,
  Row,
  Heading,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

const toDegrees = (rad: number) => Math.round(Math.abs((rad * 180) / Math.PI));

export const SlopeMeterScreen = ({siteId}: {siteId: string}) => {
  const {t} = useTranslation();
  const [permission, requestPermission] = Camera.useCameraPermissions();
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
    navigation.pop();
  }, [dispatch, siteId, deviceTiltDeg, navigation]);

  return (
    <ScreenScaffold AppBar={null} BottomNavigation={null}>
      <Row flex={1} alignItems="stretch" px="24px" py="20px">
        <Box flex={1} justifyContent="center">
          {permission?.granted ? (
            <Camera style={styles.camera}>
              <Column flex={1} alignItems="stretch">
                <Box flex={1} />
                <Box height="3px" bg="text.primary" />
                <Box height="3px" bg="primary.contrast" />
                <Box flex={1} bg="#00000080" />
              </Column>
            </Camera>
          ) : permission?.canAskAgain ? (
            <Button size="lg" onPress={requestPermission}>
              {t('slope.steepness.camera_grant')}
            </Button>
          ) : (
            <>
              <Heading variant="h6">{t('slope.steepness.no_camera')}</Heading>
              <Text variant="body1" textAlign="center">
                {t('slope.steepness.no_camera_explanation')}
              </Text>
              <Link onPress={Linking.openSettings}>
                {t('general.open_settings')}
              </Link>
            </>
          )}
        </Box>
        <Column alignItems="center">
          <Box {...styles.closeButtonBox}>
            <CardCloseButton size="lg" onPress={onClose} />
          </Box>
          <Column
            px="56px"
            flex={1}
            justifyContent="center"
            alignItems="center">
            <Row alignItems="center">
              <Heading variant="h6">{t('slope.steepness.slope_meter')}</Heading>
              <IconButton name="info" _icon={{color: 'action.active'}} />
            </Row>
            <Box height="12px" />
            <Heading variant="h5" fontWeight={700}>
              {deviceTiltDeg !== null && `${deviceTiltDeg}°`}
            </Heading>
            <Box height="5px" />
            <Heading variant="h6">
              {deviceTiltDeg !== null && `${degreeToPercent(deviceTiltDeg)}%`}
            </Heading>
            <Box height="18px" />
            <Button
              onPress={onUse}
              size="lg"
              px="46px"
              py="18px"
              {...styles.useButton}>
              {t('general.use')}
            </Button>
          </Column>
        </Column>
      </Row>
    </ScreenScaffold>
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
  useButton: {
    _text: {textTransform: 'uppercase'},
    leftIcon: <Icon name="check" />,
  },
} as const;
