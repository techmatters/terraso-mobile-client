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
import {Pressable} from 'react-native';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {CaptureResult} from 'terraso-mobile-client/components/inputs/image/captureTypes';
import {RawPickImageButton} from 'terraso-mobile-client/components/inputs/image/RawPickImageButton';
import {getActiveRoiPreset} from 'terraso-mobile-client/components/inputs/image/useRoiFrameAnalyzer';
import {
  Box,
  Column,
  Paragraph,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictBySiteRole} from 'terraso-mobile-client/components/restrictions/RestrictByRole';
import {SiteRoleContextProvider} from 'terraso-mobile-client/context/SiteRoleContext';
import {SITE_EDITOR_ROLES} from 'terraso-mobile-client/model/permissions/permissions';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {
  ExperimentalCaptureMode,
  setExperimentalCaptureMode,
  useExperimentalCaptureMode,
} from 'terraso-mobile-client/screens/SoilScreen/ColorScreenExperimental/experimentalCaptureModeToggle';
import {SoilPitInputScreenProps} from 'terraso-mobile-client/screens/SoilScreen/components/SoilPitInputScreenScaffold';

// JPEG capture path routes through the existing ColorAnalysisScreen stack.
// RAW capture path hands the DNG off to RawColorAnalysisScreen — the
// experimental ROI-picker + analysis screen. See docs/raw-camera-plan.md.
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
      // kind === 'raw'. Hand the DNG off to the experimental analysis
      // screen. CaptureResult carries functions (decodeRoi, dispose)
      // that can't be serialized through React Navigation params, so
      // we pass just the sensor dimensions + path. In 'raw-live' mode
      // we also pass the fractional overlay ROIs so the screen skips
      // the manual crop picker and analyzes those regions directly —
      // the user placed the card/sample inside those boxes when they
      // shot, so re-cropping is redundant.
      const usedLiveOverlay = captureMode === 'raw-live';
      // Read the ROI preset that was ACTIVE at capture time — the
      // user can cycle sizes via the size-selector buttons on the
      // camera screen, and whichever preset was on screen at shutter
      // is what got captured. Read fresh here (post-capture) so we
      // pick up any change made just before the shot.
      const activePreset = usedLiveOverlay ? getActiveRoiPreset() : null;
      navigation.navigate('RAW_COLOR_ANALYSIS_EXPERIMENTAL', {
        dngPath: result.dngPath,
        sensorWidth: result.width,
        sensorHeight: result.height,
        pitProps: props,
        preSelectedDisplayRois: activePreset
          ? {ref: activePreset.ref, sample: activePreset.sample}
          : undefined,
      });
    },
    [navigation, props, captureMode],
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
          <Box paddingHorizontal="md" pb="sm">
            <Text variant="caption" color="text.secondary">
              {CAPTURE_MODE_DESCRIPTION[captureMode]}
            </Text>
          </Box>
          <Box alignItems="center" paddingVertical="lg">
            <RawPickImageButton
              featureName={t('soil.color.featureName')}
              onPick={onPickImage}
              containerFormat={
                captureMode === 'raw'
                  ? 'dng'
                  : captureMode === 'raw-live'
                    ? 'dng-live'
                    : 'jpeg'
              }
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

// One-line description of what each capture mode does, shown as a
// caption under the selector so the tester doesn't have to guess
// what differs between RAW and RAW-Live. Not translated — the
// selector itself is dev/tester-facing and will be replaced when
// the RAW pipeline promotes to production.
const CAPTURE_MODE_DESCRIPTION: Record<ExperimentalCaptureMode, string> = {
  jpeg: 'JPEG pipeline (production). No live overlay, no manual crop.',
  raw: 'RAW capture. After you shoot, pick the ref-card + soil crops by hand.',
  'raw-live':
    'RAW capture. The on-camera ROI boxes (ref on top, soil on bottom) ' +
    'are used as-is — no manual crop step.',
};

// Temporary three-option selector (experimental screen only). Not
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
      label="JPEG"
      selected={current === 'jpeg'}
      onPress={() => setExperimentalCaptureMode('jpeg')}
    />
    <ModeButton
      label="RAW"
      selected={current === 'raw'}
      onPress={() => setExperimentalCaptureMode('raw')}
    />
    <ModeButton
      label="RAW-Live"
      selected={current === 'raw-live'}
      onPress={() => setExperimentalCaptureMode('raw-live')}
    />
  </Row>
);

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
