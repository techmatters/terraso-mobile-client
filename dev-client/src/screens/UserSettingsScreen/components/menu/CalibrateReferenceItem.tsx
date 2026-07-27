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

import {useCallback, useState} from 'react';

import {CaptureResult} from 'terraso-mobile-client/components/inputs/image/captureTypes';
import {RawCameraView} from 'terraso-mobile-client/components/inputs/image/RawCameraView';
import {MenuItem} from 'terraso-mobile-client/components/menus/MenuItem';
import {APP_CONFIG} from 'terraso-mobile-client/config';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';

// Dev-only menu row: opens the in-app RawCameraView requesting a DNG,
// then navigates to CalibrateReferenceScreen so the user can pick two
// ROIs (known-reference + new-reference), compute the new card's
// linear-sRGB, and save it to the MMKV custom-references library.
// See phase 6 in docs/raw-camera-plan.md.
export const CalibrateReferenceItem = () => {
  const [visible, setVisible] = useState(false);
  const navigation = useNavigation();

  const openCamera = useCallback(() => setVisible(true), []);
  const closeCamera = useCallback(() => setVisible(false), []);

  const handleCapture = useCallback(
    (result: CaptureResult) => {
      setVisible(false);
      if (result.kind !== 'raw') {
        console.warn(
          'CalibrateReferenceItem: expected raw capture, got',
          result.kind,
        );
        return;
      }
      navigation.navigate('CALIBRATE_REFERENCE_EXPERIMENTAL', {
        dngPath: result.dngPath,
        sensorWidth: result.width,
        sensorHeight: result.height,
      });
    },
    [navigation],
  );

  if (APP_CONFIG.environment === 'production') {
    return null;
  }

  return (
    <>
      <MenuItem
        variant="default"
        icon="palette"
        label="Calibrate reference card (dev)"
        onPress={openCamera}
      />
      <RawCameraView
        visible={visible}
        containerFormat="dng"
        onCancel={closeCamera}
        onCapture={handleCapture}
      />
    </>
  );
};
