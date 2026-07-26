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
      // kind === 'raw' — MVP: decode a fixed 1000×1000 centered ROI in
      // sensor coordinates and show the result. Real ROI picking + a
      // full RAW color-analysis flow is phase 5.2.
      try {
        const rgb = await result.decodeRoi({
          x: Math.max(0, Math.floor(result.width / 2 - 500)),
          y: Math.max(0, Math.floor(result.height / 2 - 500)),
          w: Math.min(1000, result.width),
          h: Math.min(1000, result.height),
        });
        Alert.alert(
          'RAW decode result',
          `Centered 1000×1000 ROI in sensor coords\n\n` +
            `linear sRGB:\n  r = ${rgb.r.toFixed(4)}\n  g = ${rgb.g.toFixed(4)}\n  b = ${rgb.b.toFixed(4)}`,
        );
        console.log(
          `ColorScreenExperimental RAW: linear sRGB r=${rgb.r.toFixed(4)} g=${rgb.g.toFixed(4)} b=${rgb.b.toFixed(4)} (${result.width}x${result.height})`,
        );
      } catch (err) {
        console.error('RAW decode failed:', err);
        Alert.alert('RAW decode failed', String(err));
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
