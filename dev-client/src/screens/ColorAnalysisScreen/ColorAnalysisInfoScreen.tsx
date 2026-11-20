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

import {useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {ActivityIndicator} from 'react-native';

import {ReferenceColorPicker} from 'terraso-mobile-client/components/inputs/ReferenceColorPicker';
import {
  Box,
  Column,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {SafeScrollView} from 'terraso-mobile-client/components/safeview/SafeScrollView';
import {munsellToRGB} from 'terraso-mobile-client/model/color/colorConversions';
import {linearToSrgb255} from 'terraso-mobile-client/model/color/colorDetection';
import {useSelectedReference} from 'terraso-mobile-client/model/rawColor/referenceColorSelection';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {
  ColorPipelineGrid,
  cssRgb,
  type PipelineColumn,
  type Rgb255,
} from 'terraso-mobile-client/screens/ColorAnalysisScreen/components/ColorPipelineGrid';
import {useColorAnalysisContext} from 'terraso-mobile-client/screens/ColorAnalysisScreen/context/colorAnalysisContext';
import {useColorPipeline} from 'terraso-mobile-client/screens/ColorAnalysisScreen/useColorPipeline';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';

// Pipeline-visualisation screen linked from the Info button next to the Munsell
// value on ColorAnalysisHomeScreen. Renders the shared reference/soil grid
// (cropped photo → measured colour → final swatch). The measurement + linear
// correction come from useColorPipeline, the same hook the combined prototype
// screen uses, so both show identical numbers. Read-only here (no swap, no
// tap-to-edit).

export const ColorAnalysisInfoScreen = () => {
  const {t} = useTranslation();
  const {
    state: {reference, soil},
  } = useColorAnalysisContext();
  const {reference: selectedRef} = useSelectedReference();
  const {measured} = useColorPipeline();

  const refExpectedCss = selectedRef
    ? cssRgb([
        linearToSrgb255(selectedRef.expected.r),
        linearToSrgb255(selectedRef.expected.g),
        linearToSrgb255(selectedRef.expected.b),
      ])
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
    heading: t('colorCamera.info.reference'),
    cropBase64: reference?.photo.base64,
    measuredRgb: measured?.referenceRgb,
    finalCss: refExpectedCss,
    finalLabel: t('colorCamera.info.refCard'),
  };
  const soilColumn: PipelineColumn = {
    heading: t('colorCamera.info.soil'),
    cropBase64: soil?.photo.base64,
    measuredRgb: measured?.soilRgb,
    finalCss: soilCorrectedCss,
    finalLabel: t('colorCamera.info.resultChip'),
  };

  return (
    <ScreenScaffold AppBar={<AppBar title={t('colorCamera.info.title')} />}>
      <SafeScrollView>
        <Column padding="md">
          <ReferenceColorPicker />
          <Box height="md" />
          {measured ? (
            <ColorPipelineGrid reference={referenceColumn} soil={soilColumn} />
          ) : (
            <Row justifyContent="center" padding="xl">
              <ActivityIndicator size="large" />
            </Row>
          )}
        </Column>
      </SafeScrollView>
    </ScreenScaffold>
  );
};
