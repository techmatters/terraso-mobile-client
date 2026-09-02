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

import {StyleSheet} from 'react-native';
import {Pressable} from 'react-native-gesture-handler';

import {CarouselPage} from 'terraso-mobile-client/components/Carousel';
import {CarouselSheet} from 'terraso-mobile-client/components/sheets/CarouselSheet';

export type CarouselButtonProps = {
  /* Rendered as the tappable trigger. A node rather than an image source, matching ImageRadio, so callers can pass either an SVG component or an <Image>. */
  image: React.ReactNode;
  pages: CarouselPage[];
  aboveHeight: number;
  sheetHeading?: React.ReactNode;
  /* Required: the trigger is image-only, so there is no text for a screen reader to fall back on. */
  accessibilityLabel: string;
};

/*
 * Image trigger that opens a CarouselSheet. Unlike InfoButton, the trigger's
 * appearance is the caller's to supply.
 */
export const CarouselButton = ({
  image,
  pages,
  aboveHeight,
  sheetHeading,
  accessibilityLabel,
}: CarouselButtonProps) => (
  <CarouselSheet
    pages={pages}
    aboveHeight={aboveHeight}
    heading={sheetHeading}
    trigger={onOpen => (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onOpen}
        style={styles.trigger}>
        {image}
      </Pressable>
    )}
  />
);

const styles = StyleSheet.create({
  /* Keeps the pressable hugging the image instead of stretching to fill a flex parent. */
  trigger: {
    alignSelf: 'flex-start',
  },
});
