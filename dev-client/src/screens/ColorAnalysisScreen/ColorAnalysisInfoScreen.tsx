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

import {useEffect, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ActivityIndicator, Image, StyleSheet} from 'react-native';

import {rgb255ToMhvc} from 'munsell';

import {decodeBase64Jpg} from 'terraso-mobile-client/components/inputs/image/ImagePicker';
import {ReferenceColorPicker} from 'terraso-mobile-client/components/inputs/ReferenceColorPicker';
import {
  Box,
  Column,
  Heading,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {SafeScrollView} from 'terraso-mobile-client/components/safeview/SafeScrollView';
import {munsellToRGB} from 'terraso-mobile-client/model/color/colorConversions';
import {
  linearToSrgb255,
  predictColorFromReference,
} from 'terraso-mobile-client/model/color/colorDetection';
import {useSelectedReference} from 'terraso-mobile-client/model/rawColor/referenceColorSelection';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {useColorAnalysisContext} from 'terraso-mobile-client/screens/ColorAnalysisScreen/context/colorAnalysisContext';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';

// Pipeline-visualisation screen linked from the Info button next to the
// Munsell value on ColorAnalysisHomeScreen. Two columns (Reference, Soil) ×
// three rows:
//   Row 1 — the cropped photo as taken (what the camera saw).
//   Row 2 — the measured colour for that region (mean of its sRGB pixels,
//           decoded in-screen). Lets the tester compare "what we measured"
//           against the raw pixels above.
//   Row 3 — the "final" colour: for Reference, the picked card's expected
//           swatch; for Soil, the Munsell chip corresponding to the result.
// Reference picker is repeated here so swapping it reruns the pipeline
// without hopping back to the home screen.

type Rgb255 = [number, number, number];

const cssRgb = (rgb: Rgb255 | undefined): string | undefined =>
  rgb ? `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` : undefined;

// Averaged sRGB (0-255) for a cropped JPEG. Same decoder the production
// colour pipeline uses, so the numbers line up with what the real algorithm
// consumes — just straight mean rather than quantize's dominant.
const meanRgb255FromBase64 = (base64: string): Rgb255 => {
  const {data, width, height} = decodeBase64Jpg(base64);
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let n = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      rSum += data[o];
      gSum += data[o + 1];
      bSum += data[o + 2];
      n += 1;
    }
  }
  if (n === 0) {
    return [0, 0, 0];
  }
  return [Math.round(rSum / n), Math.round(gSum / n), Math.round(bSum / n)];
};

type SwatchProps = {color: string | undefined; label: string};
const Swatch = ({color, label}: SwatchProps) => (
  <Column alignItems="center">
    <Box
      width={`${SWATCH_SIZE}px`}
      height={`${SWATCH_SIZE}px`}
      borderWidth="1px"
      borderColor="grey.500"
      borderRadius="md"
      bg={color ?? 'grey.200'}
    />
    <Box height="xs" />
    <Text variant="body2">{label}</Text>
  </Column>
);

// Pipeline-stage arrow label that sits between rows (e.g. "↓ avg" under the
// photo, "↓ correction" under the measured-rgb swatch). Matches the older
// branch's pipelineColumn layout.
const PipelineArrow = ({label}: {label: string}) => (
  <Text variant="body1" italic>{`↓ ${label}`}</Text>
);

// Column + swatch sizing tuned to the older branch's info-screen layout:
// two columns that fill ~45% of a phone-width screen, with chunky swatches
// (so colour differences are readable at a glance). Reduce if portrait on a
// narrow device starts clipping — current value fits on a 390pt iPhone.
const SWATCH_SIZE = 140;

export const ColorAnalysisInfoScreen = () => {
  const {t} = useTranslation();
  const {
    state: {reference, soil},
  } = useColorAnalysisContext();
  const {reference: selectedRef} = useSelectedReference();

  const referenceBase64 = reference?.photo.base64;
  const soilBase64 = soil?.photo.base64;

  // Decode each crop ONCE per capture. Changing the reference picker only
  // reruns the correction/Munsell mapping below, not the base64 decode.
  const [measured, setMeasured] = useState<{
    refRgb: Rgb255;
    soilRgb: Rgb255;
  } | null>(null);
  useEffect(() => {
    if (!referenceBase64 || !soilBase64) {
      setMeasured(null);
      return;
    }
    // Decode is CPU-bound and blocks JS — let the shell paint first.
    const t0 = Date.now();
    const timer = setTimeout(() => {
      try {
        setMeasured({
          refRgb: meanRgb255FromBase64(referenceBase64),
          soilRgb: meanRgb255FromBase64(soilBase64),
        });
        console.log(`[color-info] crop decode ${Date.now() - t0}ms`);
      } catch (err) {
        console.warn('[color-info] decode failed', err);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [referenceBase64, soilBase64]);

  // Reference-side column rows:
  //   top     = cropped reference photo (raw pixels)
  //   middle  = measured colour for that region
  //   bottom  = the picked reference card's expected colour
  // Soil-side column rows:
  //   top     = cropped soil photo
  //   middle  = measured colour
  //   bottom  = Munsell chip (correction applied via picked reference)
  const soilCorrectedMunsellRgb = useMemo<Rgb255 | undefined>(() => {
    if (!measured || !selectedRef) {
      return undefined;
    }
    // Same pipeline the production getColorFromImages uses: predict colour
    // from the measured soil + measured reference + the user-picked card's
    // expected sRGB, then map to a Munsell chip RGB.
    const refExpected255 = [
      linearToSrgb255(selectedRef.expected.r),
      linearToSrgb255(selectedRef.expected.g),
      linearToSrgb255(selectedRef.expected.b),
    ] as const;
    // predictColorFromReference consumes RGBA arrays; feed one-pixel inputs
    // to reuse the same per-channel scaling. Equivalent to running the whole
    // crop through dominantColor, but deterministic and way cheaper.
    const sampleRgba: [number, number, number, number][] = [
      [...measured.soilRgb, 255],
    ];
    const refRgba: [number, number, number, number][] = [
      [...measured.refRgb, 255],
    ];
    try {
      const [r, g, b] = predictColorFromReference(sampleRgba, refRgba, [
        ...refExpected255,
      ]);
      const munsell = rgb255ToMhvc(r, g, b);
      const chip = munsellToRGB({
        colorHue: munsell[0],
        colorValue: munsell[1],
        colorChroma: munsell[2],
      });
      return chip ? ([chip[0], chip[1], chip[2]] as Rgb255) : undefined;
    } catch {
      return undefined;
    }
  }, [measured, selectedRef]);

  const refExpectedCss = selectedRef
    ? cssRgb([
        linearToSrgb255(selectedRef.expected.r),
        linearToSrgb255(selectedRef.expected.g),
        linearToSrgb255(selectedRef.expected.b),
      ])
    : undefined;

  return (
    <ScreenScaffold AppBar={<AppBar title={t('colorCamera.info.title')} />}>
      <SafeScrollView>
        <Column padding="md">
          <ReferenceColorPicker />
          <Box height="md" />
          {measured ? (
            <Row justifyContent="space-around" alignItems="flex-start">
              {(
                [
                  {
                    heading: t('colorCamera.info.reference'),
                    cropBase64: referenceBase64,
                    measuredRgb: measured.refRgb,
                    finalCss: refExpectedCss,
                    finalLabel: t('colorCamera.info.refCard'),
                  },
                  {
                    heading: t('colorCamera.info.soil'),
                    cropBase64: soilBase64,
                    measuredRgb: measured.soilRgb,
                    finalCss: cssRgb(soilCorrectedMunsellRgb),
                    finalLabel: t('colorCamera.info.resultChip'),
                  },
                ] as const
              ).map(col => (
                <Column key={col.heading} alignItems="center" space="xs">
                  <Heading variant="h6" bold>
                    {col.heading}
                  </Heading>
                  {col.cropBase64 ? (
                    <Image
                      source={{uri: `data:image/jpeg;base64,${col.cropBase64}`}}
                      style={styles.cropImage}
                    />
                  ) : (
                    <Box style={styles.cropImage} bg="grey.300" />
                  )}
                  <Text variant="body2">{t('colorCamera.info.photo')}</Text>
                  <PipelineArrow label={t('colorCamera.info.avgStep')} />
                  <Swatch
                    color={cssRgb(col.measuredRgb)}
                    label={t('colorCamera.info.measuredRgb')}
                  />
                  <PipelineArrow label={t('colorCamera.info.correctionStep')} />
                  <Swatch color={col.finalCss} label={col.finalLabel} />
                </Column>
              ))}
            </Row>
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

const styles = StyleSheet.create({
  cropImage: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 6,
  },
});
