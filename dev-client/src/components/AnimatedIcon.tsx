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

import {useCallback, useEffect, useMemo, useRef} from 'react';
import {View} from 'react-native';

import LottieView, {LottieViewProps} from 'lottie-react-native';

export type AnimatedIconProps = {
  source: LottieViewProps['source'];
  playing: boolean;
  /* Cycles to run per `playing` activation. Omit to run until `playing` goes false. */
  maxCycles?: number;
  size?: number;
};

/*
 * Decorative Lottie animation that settles on its source's final frame when stopped.
 *
 * Authoring contract: the animation must be a seamless loop whose first and last
 * frames are the intended resting pose. `loop` is deliberately false — it is the
 * only mode in which onAnimationFinish fires, and running one cycle at a time is
 * what lets us both count cycles and guarantee we come to rest on a chosen frame
 * rather than freezing mid-motion.
 */
export const AnimatedIcon = ({
  source,
  playing,
  maxCycles,
  size = 40,
}: AnimatedIconProps) => {
  const lottieRef = useRef<LottieView>(null);
  const cyclesRemaining = useRef(0);

  useEffect(() => {
    if (playing) {
      cyclesRemaining.current = maxCycles ?? Infinity;
      lottieRef.current?.play();
    } else {
      /* Let the in-flight cycle run out rather than cutting it off mid-motion; it ends on the rest frame. */
      cyclesRemaining.current = 0;
    }
  }, [playing, maxCycles]);

  const onAnimationFinish = useCallback((isCancelled?: boolean) => {
    if (isCancelled) {
      return;
    }
    cyclesRemaining.current -= 1;
    if (cyclesRemaining.current > 0) {
      lottieRef.current?.play();
    }
  }, []);

  const style = useMemo(() => ({width: size, height: size}), [size]);

  return (
    /* LottieViewProps does not extend ViewProps, so the accessibility semantics live on a wrapper. Purely decorative: the control this accompanies carries the meaning. */
    <View
      style={style}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      <LottieView
        ref={lottieRef}
        source={source}
        style={style}
        loop={false}
        autoPlay={false}
        resizeMode="contain"
        onAnimationFinish={onAnimationFinish}
      />
    </View>
  );
};
