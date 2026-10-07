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

import {Image, ImageSourcePropType, StyleSheet} from 'react-native';

export type CarouselImageProps = {
  source: ImageSourcePropType;
  /* Set only when the art carries something its page's copy does not. Illustrations that restate the copy should stay unlabeled, or a screen reader announces the same information twice. */
  accessibilityLabel?: string;
};

/*
 * Art for a carousel page's above-zone. Fills the zone and scales to fit
 * uncropped, which is what the zone expects: it sizes its container only, so a
 * bare Image would render at its intrinsic size and be clipped.
 *
 * resizeMode is deliberately not configurable — never cropping the art is the
 * reason this exists. Anything needing other behavior should use Image directly.
 */
export const CarouselImage = ({
  source,
  accessibilityLabel,
}: CarouselImageProps) => (
  <Image
    source={source}
    style={styles.image}
    resizeMode="contain"
    accessible={accessibilityLabel !== undefined}
    accessibilityLabel={accessibilityLabel}
    accessibilityRole={accessibilityLabel === undefined ? undefined : 'image'}
  />
);

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
});
