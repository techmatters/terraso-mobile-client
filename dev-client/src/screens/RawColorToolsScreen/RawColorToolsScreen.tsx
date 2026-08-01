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
import Share from 'react-native-share';

import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import {DngDecoderHybrid} from 'dng-decoder';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {CaptureResult} from 'terraso-mobile-client/components/inputs/image/captureTypes';
import {RawCameraView} from 'terraso-mobile-client/components/inputs/image/RawCameraView';
import {Select} from 'terraso-mobile-client/components/inputs/Select';
import {
  Column,
  Paragraph,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {SafeScrollView} from 'terraso-mobile-client/components/safeview/SafeScrollView';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {kvStorage} from 'terraso-mobile-client/persistence/kvStorage';
import {CHART_GUIDE} from 'terraso-mobile-client/screens/MunsellChartValidator/chartGuide';
import {
  REGISTRATION_ALGORITHMS,
  resolveRegistrationAlgorithm,
  type RegistrationAlgorithm,
} from 'terraso-mobile-client/screens/MunsellChartValidator/matchAlgorithm';
import {MUNSELL_PAGES} from 'terraso-mobile-client/screens/MunsellChartValidator/munsellPages';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';

// Dev-only aggregate screen — one place for all RAW / DNG / colour-
// reference tools that used to be scattered as individual items in the
// UserSettingsScreen menu. Grouping them:
//   - Reduces menu noise in settings (dev items dominated the list).
//   - Lets the Munsell validator ask for a chart-page pick BEFORE
//     capture, which lets its RANSAC use a page-SPECIFIC ref grid
//     (universal MAX grid + wrong page = shifted-by-one fits win).
//   - Sets up an obvious spot to add a "load DNG from Files" entry
//     later without touching UserSettingsScreen again.

const CHART_PAGE_HUE_KEY = 'munsellChartValidator.selectedPageHue';
const CHART_ALGORITHM_KEY = 'munsellChartValidator.registrationAlgorithm';

// Pick 'raw' for .dng and 'photo' for common photo formats; null for
// anything else (we bail on unsupported extensions). Case-insensitive.
const detectFormatFromName = (name: string): 'raw' | 'photo' | null => {
  const lower = name.toLowerCase();
  if (lower.endsWith('.dng')) return 'raw';
  if (
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg') ||
    lower.endsWith('.heic') ||
    lower.endsWith('.heif') ||
    lower.endsWith('.png')
  ) {
    return 'photo';
  }
  return null;
};

// Which capture flow the RawCameraView modal (mounted once at the
// bottom of this screen) is currently servicing. Non-null while the
// modal is open; used by onCapture to route the resulting DNG or
// JPEG to the right downstream screen.
type CaptureFlow =
  | {kind: 'fixture'} // dev: log to Metro + share sheet
  | {kind: 'calibrate'}
  | {
      kind: 'chart';
      pageHue: string;
      format: 'raw' | 'photo';
      algorithm: RegistrationAlgorithm;
    };

export const RawColorToolsScreen = () => {
  const navigation = useNavigation();
  const [pageHue, setPageHueState] = useState<string>(() => {
    const persisted = kvStorage.getString(CHART_PAGE_HUE_KEY);
    if (persisted && MUNSELL_PAGES.some(p => p.hue === persisted)) {
      return persisted;
    }
    return MUNSELL_PAGES[0].hue;
  });
  const setPageHue = useCallback((hue: string) => {
    kvStorage.setString(CHART_PAGE_HUE_KEY, hue);
    setPageHueState(hue);
  }, []);
  const [algorithm, setAlgorithmState] = useState<RegistrationAlgorithm>(() =>
    resolveRegistrationAlgorithm(kvStorage.getString(CHART_ALGORITHM_KEY)),
  );
  const setAlgorithm = useCallback((a: RegistrationAlgorithm) => {
    kvStorage.setString(CHART_ALGORITHM_KEY, a);
    setAlgorithmState(a);
  }, []);
  const [captureFlow, setCaptureFlow] = useState<CaptureFlow | null>(null);
  const cancelCapture = useCallback(() => setCaptureFlow(null), []);

  // Fixture-capture handoff: decode a centred ROI to check the pipeline
  // end-to-end and pop the share sheet so the tester can AirDrop the
  // DNG off-device for offline inspection. Same behaviour the retired
  // CaptureRawFixtureItem had.
  const handleFixtureCapture = useCallback(async (uri: string) => {
    try {
      const roi = {x: 1500, y: 1000, w: 1000, h: 1000};
      const [rgb] = await DngDecoderHybrid.decodeDngRois(uri, [roi]);
      console.log(
        `DngDecoder: ROI ${roi.x},${roi.y} ${roi.w}x${roi.h} → linear sRGB (` +
          `r=${rgb.r.toFixed(4)}, g=${rgb.g.toFixed(4)}, b=${rgb.b.toFixed(4)})`,
      );
    } catch (err) {
      console.error('DngDecoder.decodeDngRois failed:', err);
    }
    try {
      await Share.open({
        url: uri,
        type: 'image/x-adobe-dng',
        failOnCancel: false,
      });
    } catch (err) {
      console.error('RawColorToolsScreen: fixture share failed', err);
    }
  }, []);

  const onCapture = useCallback(
    (result: CaptureResult) => {
      const flow = captureFlow;
      setCaptureFlow(null);
      if (!flow) return;
      if (flow.kind === 'calibrate' || flow.kind === 'fixture') {
        // Calibrate & fixture both require RAW; fixture is handled
        // by onRawPhotoDevOnly (no nav here).
        if (result.kind !== 'raw') {
          console.warn(
            'RawColorToolsScreen: expected raw capture for',
            flow.kind,
            'got',
            result.kind,
          );
          return;
        }
        if (flow.kind === 'calibrate') {
          navigation.navigate('CALIBRATE_REFERENCE_EXPERIMENTAL', {
            dngPath: result.dngPath,
            sensorWidth: result.width,
            sensorHeight: result.height,
          });
        }
      } else if (flow.kind === 'chart') {
        // Chart accepts either — the picked format was baked into the
        // flow when the button was tapped, and matches the container
        // format the camera was configured with.
        const path = result.kind === 'raw' ? result.dngPath : result.photo.uri;
        navigation.navigate('MUNSELL_CHART_VALIDATOR', {
          dngPath: path,
          pageHue: flow.pageHue,
          format: flow.format,
          algorithm: flow.algorithm,
        });
      }
    },
    [navigation, captureFlow],
  );

  // The RawCameraView is a Modal — mount it always with visible driven
  // by captureFlow. Its containerFormat and any per-flow prop set (like
  // the chart-guide overlay) depends on which flow requested it.
  const cameraVisible = captureFlow !== null;

  return (
    <ScreenScaffold AppBar={<AppBar title="RAW & color tools" />}>
      <SafeScrollView>
        <Column padding="md" space="md">
          <Paragraph>
            Experimental RAW-DNG based colour capture, plus dev tools around
            reference calibration and the Munsell chart validator.
          </Paragraph>

          <Text variant="body1" bold>
            RAW fixture capture
          </Text>
          <Paragraph>
            Take a DNG, log the centre ROI's linear-sRGB to Metro, and AirDrop /
            share the raw file for offline inspection.
          </Paragraph>
          <ContainedButton
            label="Capture RAW fixture"
            onPress={() => setCaptureFlow({kind: 'fixture'})}
          />

          <Text variant="body1" bold>
            References
          </Text>
          <Paragraph>
            Calibrate a new custom colour reference from a card, or review /
            delete existing ones.
          </Paragraph>
          <ContainedButton
            label="Calibrate reference…"
            onPress={() => setCaptureFlow({kind: 'calibrate'})}
          />
          <ContainedButton
            label="Manage custom references"
            onPress={() =>
              navigation.navigate('MANAGE_CUSTOM_REFERENCES_EXPERIMENTAL')
            }
          />

          <Text variant="body1" bold>
            Munsell chart validator
          </Text>
          <Paragraph>
            Compare a DNG of a Munsell soil-colour page to the published values,
            cell by cell. Pick the page BEFORE capture so the registration knows
            the exact chip layout.
          </Paragraph>
          <Select<string, false>
            nullable={false}
            options={MUNSELL_PAGES.map(p => p.hue)}
            value={pageHue}
            onValueChange={setPageHue}
            renderValue={hue => `Munsell ${hue} page`}
            label="Chart page"
          />
          <Select<RegistrationAlgorithm, false>
            nullable={false}
            options={REGISTRATION_ALGORITHMS.map(a => a.id)}
            value={algorithm}
            onValueChange={setAlgorithm}
            renderValue={id =>
              REGISTRATION_ALGORITHMS.find(a => a.id === id)?.label ?? id
            }
            label="Registration algorithm"
          />
          <ContainedButton
            label="Capture raw (DNG)"
            onPress={() =>
              setCaptureFlow({
                kind: 'chart',
                pageHue,
                format: 'raw',
                algorithm,
              })
            }
          />
          <ContainedButton
            label="Capture photo (JPEG)"
            onPress={() =>
              setCaptureFlow({
                kind: 'chart',
                pageHue,
                format: 'photo',
                algorithm,
              })
            }
          />
          <ContainedButton
            label="Load from file…"
            onPress={async () => {
              // Wildcard type + extension detection: DNGs are labelled
              // with various UTIs depending on source app, and photos
              // are labelled with their own set. Filter by extension
              // so Files' picker offers everything and we route based
              // on what the user actually picked.
              const res = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
                multiple: false,
              });
              if (res.canceled) return;
              const asset = res.assets?.[0];
              if (!asset) return;
              const format = detectFormatFromName(asset.name);
              if (!format) {
                console.warn(
                  'RawColorToolsScreen: unsupported file extension',
                  asset.name,
                );
                return;
              }
              const path = asset.uri.startsWith('file://')
                ? asset.uri
                : `file://${asset.uri}`;
              navigation.navigate('MUNSELL_CHART_VALIDATOR', {
                dngPath: path,
                pageHue,
                format,
                algorithm,
              });
            }}
          />
          <ContainedButton
            label="Load from photos…"
            onPress={async () => {
              // Photos always come through as JPEG/HEIC from the
              // Photos library (iOS auto-converts RAW to JPEG at pick
              // time, so DNG-from-Photos isn't possible via this
              // path — use Load from file for DNGs).
              const perm =
                await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (!perm.granted) {
                console.warn(
                  'RawColorToolsScreen: photo library permission denied',
                );
                return;
              }
              const res = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: false,
                exif: false,
              });
              if (res.canceled) return;
              const asset = res.assets?.[0];
              if (!asset) return;
              const path = asset.uri.startsWith('file://')
                ? asset.uri
                : `file://${asset.uri}`;
              navigation.navigate('MUNSELL_CHART_VALIDATOR', {
                dngPath: path,
                pageHue,
                format: 'photo',
                algorithm,
              });
            }}
          />
        </Column>
      </SafeScrollView>
      <RawCameraView
        visible={cameraVisible}
        containerFormat={
          captureFlow?.kind === 'chart' && captureFlow.format === 'photo'
            ? 'jpeg'
            : 'dng'
        }
        onCancel={cancelCapture}
        onCapture={onCapture}
        onRawPhotoDevOnly={
          captureFlow?.kind === 'fixture' ? handleFixtureCapture : undefined
        }
        chartGuide={captureFlow?.kind === 'chart' ? CHART_GUIDE : undefined}
      />
    </ScreenScaffold>
  );
};
