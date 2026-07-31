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

import type {CaptureResult} from 'terraso-mobile-client/components/inputs/image/captureTypes';
import {RawCameraView} from 'terraso-mobile-client/components/inputs/image/RawCameraView';
import {MenuItem} from 'terraso-mobile-client/components/menus/MenuItem';
import {APP_CONFIG} from 'terraso-mobile-client/config';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';

// Dev-only menu row: capture a DNG of the 10YR Munsell soil-colour
// card, then navigate to MunsellChartValidatorScreen which
// auto-registers the chart, decodes every swatch, and shows the
// measured-vs-expected grid.
export const MunsellChartValidatorItem = () => {
  const [visible, setVisible] = useState(false);
  const navigation = useNavigation();

  const openCamera = useCallback(() => setVisible(true), []);
  const closeCamera = useCallback(() => setVisible(false), []);

  const onCapture = useCallback(
    (result: CaptureResult) => {
      setVisible(false);
      if (result.kind !== 'raw') return; // shouldn't happen with dng mode
      navigation.navigate('MUNSELL_CHART_VALIDATOR', {
        dngPath: result.dngPath,
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
        icon="grid-view"
        label="Munsell chart validator (dev)"
        onPress={openCamera}
      />
      <RawCameraView
        visible={visible}
        containerFormat="dng"
        onCancel={closeCamera}
        onCapture={onCapture}
        chartGuide={{aspectW: 4.5, aspectH: 7, marginFrac: 0.1}}
      />
    </>
  );
};
