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

import {StyleSheet, View} from 'react-native';
import Svg, {Image as SvgImage} from 'react-native-svg';

import {
  Column,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {linearToSrgb} from 'terraso-mobile-client/model/color/colorDetection';
import {LinearRgb} from 'terraso-mobile-client/model/color/getColorFromLinearRgb';

// Preview-space rectangle in pixels. Matches what runAnalyze and
// decodeCalibrationCrops both consume; kept here as the canonical
// shape so consumers of PipelineColumn don't need to import from
// the analysis screen.
export type PreviewRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

// Convert a linear-sRGB triple to a CSS rgb() string suitable for a
// backgroundColor prop. The colour pipeline keeps values in linear
// light throughout; gamma-encoding here at display time is the
// standard fix so the swatch renders correctly on the (sRGB-managed)
// screen.
export const linearRgbToCss = (linearRgb: LinearRgb): string => {
  const toByte = (v: number) => Math.round(linearToSrgb(v));
  return `rgb(${toByte(linearRgb.r)}, ${toByte(linearRgb.g)}, ${toByte(linearRgb.b)})`;
};

// Convert a gamma-encoded sRGB 0-255 triple (what mhvcToRgb255
// returns for the Munsell chip lookup) to a CSS rgb() string. No
// gamma re-encoding — it's already display-ready.
export const rgb255ToCss = (rgb: readonly [number, number, number]): string =>
  `rgb(${Math.round(rgb[0])}, ${Math.round(rgb[1])}, ${Math.round(rgb[2])})`;

// One column of a two-column pipeline visualisation:
//   heading (e.g. Reference / Soil, Existing / New)
//     photo — cropped ROI region from the DNG preview
//   ↓ avg
//     measured colour swatch — mean linear-sRGB inside the ROI
//   ↓ correction
//     final colour swatch — depends on the caller's context (a Munsell
//     chip on the soil-id side, the picked / computed ref card on the
//     calibrate side).
//
// The `finalCss` prop lets the caller supply the bottom swatch as any
// CSS colour string (usually via `linearRgbToCss` or `rgb255ToCss`
// depending on the colourspace journey) so this component doesn't
// care about the source pipeline — it just renders what it's told.
export const PipelineColumn = ({
  heading,
  photoRect,
  preview,
  measuredLinearRgb,
  finalCss,
  finalLabel,
}: {
  heading: string;
  photoRect: PreviewRect;
  preview: {uri: string; width: number; height: number};
  measuredLinearRgb: LinearRgb;
  finalCss: string;
  finalLabel: string;
}) => {
  const measuredCss = linearRgbToCss(measuredLinearRgb);
  return (
    <Column alignItems="center" space="sm">
      <Text variant="body2" bold>
        {heading}
      </Text>
      <RoiCropSquare rect={photoRect} preview={preview} />
      <Text variant="caption">photo</Text>
      <Text variant="body2">↓ avg</Text>
      <ColorSquare css={measuredCss} />
      <Text variant="caption">measured rgb</Text>
      <Text variant="body2">↓ correction</Text>
      <ColorSquare css={finalCss} />
      <Text variant="caption">{finalLabel}</Text>
    </Column>
  );
};

// Fixed-size square filled with a CSS colour. Shared border treatment
// with RoiCropSquare so the pipeline stack reads uniformly.
export const ColorSquare = ({css}: {css: string}) => (
  <View style={[styles.pipelineSquare, {backgroundColor: css}]} />
);

// The DNG preview is rendered portrait; the user held the phone
// landscape-CCW so what they saw as "top" maps to the preview's right
// edge. Rotating -90° here brings the preview's right back to visual
// top — matches the framing at capture time.
export const RoiCropSquare = ({
  rect,
  preview,
}: {
  rect: PreviewRect;
  preview: {uri: string; width: number; height: number};
}) => (
  <View style={[styles.pipelineSquare, styles.roiCropRotated]}>
    <Svg
      width="100%"
      height="100%"
      viewBox={`${rect.left} ${rect.top} ${rect.width} ${rect.height}`}
      preserveAspectRatio="xMidYMid slice">
      <SvgImage
        href={preview.uri}
        x={0}
        y={0}
        width={preview.width}
        height={preview.height}
        preserveAspectRatio="xMidYMid meet"
      />
    </Svg>
  </View>
);

const styles = StyleSheet.create({
  pipelineSquare: {
    width: 96,
    height: 96,
    borderWidth: 1,
    borderColor: '#8a8a8a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  roiCropRotated: {
    transform: [{rotate: '-90deg'}],
  },
});
