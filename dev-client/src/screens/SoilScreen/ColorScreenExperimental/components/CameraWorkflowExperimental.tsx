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

import {useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {Alert, Pressable} from 'react-native';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {CaptureResult} from 'terraso-mobile-client/components/inputs/image/captureTypes';
import {RawPickImageButton} from 'terraso-mobile-client/components/inputs/image/RawPickImageButton';
import {
  Box,
  Column,
  Paragraph,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictBySiteRole} from 'terraso-mobile-client/components/restrictions/RestrictByRole';
import {SiteRoleContextProvider} from 'terraso-mobile-client/context/SiteRoleContext';
import {munsellToString} from 'terraso-mobile-client/model/color/colorConversions';
import {getColorFromLinearRgb} from 'terraso-mobile-client/model/color/getColorFromLinearRgb';
import {SITE_EDITOR_ROLES} from 'terraso-mobile-client/model/permissions/permissions';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {
  ExperimentalCaptureMode,
  setExperimentalCaptureMode,
  useExperimentalCaptureMode,
} from 'terraso-mobile-client/screens/SoilScreen/ColorScreenExperimental/experimentalCaptureModeToggle';
import {SoilPitInputScreenProps} from 'terraso-mobile-client/screens/SoilScreen/components/SoilPitInputScreenScaffold';

// Same JPEG capture path as production CameraWorkflow — hand a JPEG Photo
// to the existing ColorAnalysisScreen stack. The RAW path takes a
// captured DNG, decodes a centered ROI via DngDecoderHybrid, and
// currently just shows the linear-sRGB triple in an Alert. Full RAW
// integration into the color-analysis flow (ROI picking, reference-card
// matching against decoded linear-RGB) lands in phase 5.2.
export const CameraWorkflowExperimental = (props: SoilPitInputScreenProps) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const captureMode = useExperimentalCaptureMode();

  const onPickImage = useCallback(
    async (result: CaptureResult) => {
      if (result.kind === 'jpeg') {
        navigation.navigate('COLOR_ANALYSIS', {
          photo: result.photo,
          pitProps: props,
        });
        return;
      }
      // kind === 'raw'. MVP: decode two fixed ROIs — reference card in
      // top half of frame, soil sample in bottom half. User is expected
      // to frame the shot accordingly. Run through getColorFromLinearRgb
      // and display the Munsell result. Real per-ROI picker UI comes
      // in a later phase.
      const {refRoi, sampleRoi} = computeFixedRois(result.width, result.height);
      try {
        const [card, sample] = await Promise.all([
          result.decodeRoi(refRoi),
          result.decodeRoi(sampleRoi),
        ]);
        const colorResult = getColorFromLinearRgb(
          card,
          sample,
          'POST_IT_YELLOW',
        );
        const munsellText = describeMunsell(colorResult);
        Alert.alert(
          'RAW analysis (single shot)',
          `Card (top ROI): r=${card.r.toFixed(3)} g=${card.g.toFixed(3)} b=${card.b.toFixed(3)}\n` +
            `Sample (bottom ROI): r=${sample.r.toFixed(3)} g=${sample.g.toFixed(3)} b=${sample.b.toFixed(3)}\n\n` +
            `Reference target: POST_IT_YELLOW\n\n` +
            `Munsell: ${munsellText}`,
        );
        console.log(
          `ColorScreenExperimental RAW analysis: card=(${card.r.toFixed(3)},${card.g.toFixed(3)},${card.b.toFixed(3)}) ` +
            `sample=(${sample.r.toFixed(3)},${sample.g.toFixed(3)},${sample.b.toFixed(3)}) → ${munsellText}`,
        );
      } catch (err) {
        console.error('RAW analysis failed:', err);
        Alert.alert('RAW analysis failed', String(err));
      } finally {
        result.dispose();
      }
    },
    [navigation, props],
  );

  const onUseGuide = useCallback(
    () => navigation.navigate('COLOR_GUIDE', props),
    [props, navigation],
  );

  return (
    <SiteRoleContextProvider siteId={props.siteId}>
      <RestrictBySiteRole role={SITE_EDITOR_ROLES}>
        <Column>
          <CaptureModeSelector current={captureMode} />
          <Box alignItems="center" paddingVertical="lg">
            <RawPickImageButton
              featureName={t('soil.color.featureName')}
              onPick={onPickImage}
              containerFormat={captureMode === 'raw' ? 'dng' : 'jpeg'}
            />
          </Box>
          <Column
            backgroundColor="grey.300"
            paddingHorizontal="md"
            paddingVertical="lg"
            alignItems="flex-start">
            <Paragraph>{t('soil.color.photo_need_help')}</Paragraph>
            <ContainedButton
              onPress={onUseGuide}
              rightIcon="chevron-right"
              label={t('soil.color.use_guide_label')}
            />
          </Column>
        </Column>
      </RestrictBySiteRole>
    </SiteRoleContextProvider>
  );
};

// Temporary two-option selector (experimental screen only). Not
// translated — this UI is dev/tester-facing and will be replaced
// entirely when the RAW pipeline is ready to promote to production.
const CaptureModeSelector = ({current}: {current: ExperimentalCaptureMode}) => (
  <Row
    paddingHorizontal="md"
    paddingVertical="sm"
    backgroundColor="grey.200"
    justifyContent="center"
    space="md">
    <ModeButton
      label="JPEG capture"
      selected={current === 'jpeg'}
      onPress={() => setExperimentalCaptureMode('jpeg')}
    />
    <ModeButton
      label="RAW capture"
      selected={current === 'raw'}
      onPress={() => setExperimentalCaptureMode('raw')}
    />
  </Row>
);

// Split the frame vertically: reference goes in the top quarter,
// soil sample in the bottom quarter. ROI width is 60% of the shorter
// image dimension; height is 20% of the longer dimension. Numbers
// picked to leave visible margins so the user can frame confidently.
const computeFixedRois = (
  width: number,
  height: number,
): {refRoi: Roi; sampleRoi: Roi} => {
  const shorter = Math.min(width, height);
  const longer = Math.max(width, height);
  const w = Math.floor(shorter * 0.6);
  const h = Math.floor(longer * 0.2);
  const x = Math.floor((width - w) / 2);
  // Portrait: height > width. Top = small y. If landscape, this still
  // produces two disjoint centered ROIs, just labeled "top"/"bottom"
  // relative to whichever axis we chose.
  return {
    refRoi: {x, y: Math.floor(height * 0.15), w, h},
    sampleRoi: {x, y: Math.floor(height * 0.65), w, h},
  };
};

type Roi = {x: number; y: number; w: number; h: number};

const describeMunsell = (result: {
  result?: {colorHue: number; colorValue: number; colorChroma: number};
  nearestValidResult?: {
    colorHue: number;
    colorValue: number;
    colorChroma: number;
  };
  invalidResult?: {
    colorHue: number;
    colorValue: number;
    colorChroma: number;
  };
}): string => {
  const inRange = result.result;
  if (inRange) {
    return `${munsellToString(inRange)} (matched soil color)`;
  }
  const nearest = result.nearestValidResult;
  const invalid = result.invalidResult;
  return (
    (invalid
      ? `Predicted: ${munsellToString(invalid)} (no close soil match)\n`
      : '') + (nearest ? `Nearest soil color: ${munsellToString(nearest)}` : '')
  );
};

const ModeButton = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => (
  <Pressable onPress={onPress}>
    <Box
      paddingHorizontal="md"
      paddingVertical="sm"
      borderRadius="4px"
      borderWidth={selected ? '2px' : '1px'}
      borderColor={selected ? 'primary.main' : 'grey.500'}
      backgroundColor={selected ? 'primary.main' : 'transparent'}>
      <Text color={selected ? 'white' : 'text.primary'} bold={selected}>
        {label}
      </Text>
    </Box>
  </Pressable>
);
