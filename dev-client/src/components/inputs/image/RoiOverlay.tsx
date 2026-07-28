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
import Animated, {
  useAnimatedProps,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, {Defs, Mask, Rect} from 'react-native-svg';

import {
  COLOR_GREEN,
  COLOR_RED,
} from 'terraso-mobile-client/components/inputs/image/useRoiFrameAnalyzer';

// Phase-8.4 iOS overlay. Dim mask outside two ROIs, coloured borders on
// each. Colour codes come from useRoiFrameAnalyzer's shared values —
// changes flow worklet → reanimated → SVG stroke without touching React
// state, so re-renders don't fire on every camera frame.
//
// Kept cross-platform so a future refactor can retire Android's native
// RoiOverlayView and use this component on both platforms.

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const STROKE_WIDTH = 4;
const MASK_FILL = 'rgba(0,0,0,0.66)';

export type FractionalRoi = {x: number; y: number; w: number; h: number};

type Props = {
  refRoi: FractionalRoi;
  sampleRoi: FractionalRoi;
  refCode: SharedValue<number>;
  sampleCode: SharedValue<number>;
};

export const RoiOverlay = ({refRoi, sampleRoi, refCode, sampleCode}: Props) => {
  const refAnimatedProps = useAnimatedProps(() => ({
    stroke: codeToColor(refCode.value),
  }));
  const sampleAnimatedProps = useAnimatedProps(() => ({
    stroke: codeToColor(sampleCode.value),
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg
        style={StyleSheet.absoluteFill}
        // viewBox in fractional coords lets us specify all rects in
        // 0..1 regardless of actual display size.
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
        <AnimatedRect
          x={refRoi.x}
          y={refRoi.y}
          width={refRoi.w}
          height={refRoi.h}
          fill="none"
          // Stroke width in fractional coords needs to be tiny — 4px at a
          // typical 400x600 preview is ~0.006 of the shorter dimension.
          // Non-scaling-stroke keeps the stroke a fixed pixel width
          // regardless of preserveAspectRatio="none".
          strokeWidth={STROKE_WIDTH}
          vectorEffect="non-scaling-stroke"
          animatedProps={refAnimatedProps}
        />
        <AnimatedRect
          x={sampleRoi.x}
          y={sampleRoi.y}
          width={sampleRoi.w}
          height={sampleRoi.h}
          fill="none"
          strokeWidth={STROKE_WIDTH}
          vectorEffect="non-scaling-stroke"
          animatedProps={sampleAnimatedProps}
        />
      </Svg>
    </View>
  );
};

function codeToColor(code: number): string {
  'worklet';
  switch (code) {
    case COLOR_RED:
      return '#FF3B30';
    case COLOR_GREEN:
      return '#34C759';
    default:
      return '#CCCCCC';
  }
}
