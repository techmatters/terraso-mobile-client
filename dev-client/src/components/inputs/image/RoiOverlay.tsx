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

import {StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import Animated, {
  useAnimatedProps,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {Defs, Mask, Rect} from 'react-native-svg';

// Phase-8.4 iOS overlay. The layout assumes the user is holding the
// phone in **landscape**, rotated 90° CCW from portrait (top of phone
// tipped to the user's left). The app's UI is portrait-locked at the
// window level, so we don't try to detect physical orientation — we
// just tell users to hold the phone this way, which is also friendlier
// for even lighting on a soil-plus-card scene.
//
// Layout in screen-coordinate terms (portrait-fixed):
//   - The two ROIs stack along the screen-y axis (still).
//     In the user's landscape view they appear side-by-side: the "Ref"
//     ROI (upper in screen coords) sits on the user's RIGHT; the
//     "Soil" ROI (lower in screen coords) sits on the user's LEFT.
//   - Each ROI's quality bar sits ABOVE the box in screen coords —
//     which is the physical LEFT side of the box in landscape-CCW.
//     Bar is a horizontal rect spanning the box's screen-x range;
//     fill grows left-to-right in screen coords (= bottom-to-top in
//     the user's landscape view).
//   - Each ROI's label sits at the box's screen-LEFT (physical
//     bottom of box in landscape), rotated 90° CW so it reads
//     correctly. Deliberately on a *different* side of the box than
//     the bar so the two don't overlap.
//
// Non-uniform SVG scaling (preserveAspectRatio="none") is required so
// the rects align with the underlying camera preview which fills the
// screen — but it shears rotated text. Labels therefore live in a
// separate RN <View> layer with plain CSS transforms.

const AnimatedRect = Animated.createAnimatedComponent(Rect);

// SVG viewBox units are fractional 0..1.
const STROKE_WIDTH = 8;
const MASK_FILL = 'rgba(0,0,0,0.66)';
// Bar geometry — horizontal rectangle ABOVE the ROI in screen coords
// (physical LEFT of the box in landscape-CCW).
const BAR_THICKNESS = 0.02;
const BAR_GAP = 0.008;
const BAR_TRACK_FILL = 'rgba(255,255,255,0.25)';
// Green when quality > 0, red when it bottoms out. Same rule for the
// border stroke so bar-full-and-green vs bar-empty-and-red carry the
// same signal.
const COLOR_GREEN = '#34C759';
const COLOR_RED = '#FF3B30';

// Label layer sizing (pixels, not fractional — RN <Text>).
const LABEL_FONT_SIZE = 22;
const LABEL_FONT_WEIGHT: '700' = '700';
// Screen-x offset (in **pixels**) from the box's screen-left edge out
// to where the label anchor sits. Pixels (not a fraction) because it's
// a glyph-clearance measurement — rotated "Ref"/"Soil" spans roughly
// 40px on each side of the anchor after a 90° CW rotation around the
// anchor's center, so anything smaller lets the text bleed back over
// the ROI border (which is user-bottom of the box in landscape-CCW).
const LABEL_OFFSET_PX = 55;

export type FractionalRoi = {x: number; y: number; w: number; h: number};

type Props = {
  refRoi: FractionalRoi;
  sampleRoi: FractionalRoi;
  refQuality: SharedValue<number>;
  sampleQuality: SharedValue<number>;
};

const REF_LABEL = 'Ref';
const SAMPLE_LABEL = 'Soil';

export const RoiOverlay = ({
  refRoi,
  sampleRoi,
  refQuality,
  sampleQuality,
}: Props) => {
  const {width: screenW, height: screenH} = useWindowDimensions();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg
        style={StyleSheet.absoluteFill}
        viewBox="0 0 1 1"
        preserveAspectRatio="none">
        <Defs>
          <Mask id="dim-mask" x={0} y={0} width={1} height={1}>
            {/* White = drawn (dim); black = punched-out (transparent). */}
            <Rect x={0} y={0} width={1} height={1} fill="white" />
            <Rect
              x={refRoi.x}
              y={refRoi.y}
              width={refRoi.w}
              height={refRoi.h}
              fill="black"
            />
            <Rect
              x={sampleRoi.x}
              y={sampleRoi.y}
              width={sampleRoi.w}
              height={sampleRoi.h}
              fill="black"
            />
          </Mask>
        </Defs>
        <Rect
          x={0}
          y={0}
          width={1}
          height={1}
          fill={MASK_FILL}
          mask="url(#dim-mask)"
        />
        <RoiWithBar roi={refRoi} quality={refQuality} />
        <RoiWithBar roi={sampleRoi} quality={sampleQuality} />
      </Svg>
      {/* Labels sit above the SVG in a plain RN layer so rotation
         doesn't get sheared by the non-uniform SVG scale. */}
      <RotatedLabel
        roi={refRoi}
        label={REF_LABEL}
        screenW={screenW}
        screenH={screenH}
      />
      <RotatedLabel
        roi={sampleRoi}
        label={SAMPLE_LABEL}
        screenW={screenW}
        screenH={screenH}
      />
    </View>
  );
};

// Draws a ROI border + quality bar ABOVE the box in screen coords
// (which is the physical LEFT side of the box in landscape-CCW). The
// bar is a horizontal rect whose fill grows left-to-right in screen
// coords (= bottom-to-top in the user's landscape view).
const RoiWithBar = ({
  roi,
  quality,
}: {
  roi: FractionalRoi;
  quality: SharedValue<number>;
}) => {
  const borderProps = useAnimatedProps(() => ({
    stroke: qualityToColor(quality.value),
  }));
  const fillProps = useAnimatedProps(() => ({
    width: roi.w * quality.value,
    fill: qualityToColor(quality.value),
  }));

  const barY = roi.y - BAR_GAP - BAR_THICKNESS;
  return (
    <>
      <AnimatedRect
        x={roi.x}
        y={roi.y}
        width={roi.w}
        height={roi.h}
        fill="none"
        strokeWidth={STROKE_WIDTH}
        vectorEffect="non-scaling-stroke"
        animatedProps={borderProps}
      />
      {/* Track (dim, always full length) so an empty bar is still visible. */}
      <Rect
        x={roi.x}
        y={barY}
        width={roi.w}
        height={BAR_THICKNESS}
        fill={BAR_TRACK_FILL}
      />
      {/* Fill grows from the left of the bar rightward. */}
      <AnimatedRect
        x={roi.x}
        y={barY}
        height={BAR_THICKNESS}
        animatedProps={fillProps}
      />
    </>
  );
};

// RN <Text> anchored to the screen-left of a ROI, rotated 90° CW so
// the glyphs read correctly when the phone is held landscape-CCW.
const RotatedLabel = ({
  roi,
  label,
  screenW,
  screenH,
}: {
  roi: FractionalRoi;
  label: string;
  screenW: number;
  screenH: number;
}) => {
  const centerY = (roi.y + roi.h / 2) * screenH;
  // Anchor sits screen-left of the ROI border. RN's `rotate` transform
  // pivots around the element's center, so we bias the top by half the
  // font size to keep the rotated glyphs centered on the ROI's midline.
  const anchorX = roi.x * screenW - LABEL_OFFSET_PX;
  const anchorY = centerY - LABEL_FONT_SIZE / 2;
  return (
    <View style={[styles.labelWrap, {left: anchorX, top: anchorY}]}>
      <Text style={styles.labelText}>{label}</Text>
    </View>
  );
};

function qualityToColor(quality: number): string {
  'worklet';
  return quality > 0 ? COLOR_GREEN : COLOR_RED;
}

const styles = StyleSheet.create({
  labelWrap: {
    position: 'absolute',
    // Rotate 90° CW so text reads landscape-normal when the phone is
    // held rotated 90° CCW. `rotate` on RN happens around the element's
    // center by default.
    transform: [{rotate: '90deg'}],
  },
  labelText: {
    color: 'white',
    fontSize: LABEL_FONT_SIZE,
    fontWeight: LABEL_FONT_WEIGHT,
    textAlign: 'center',
  },
});
