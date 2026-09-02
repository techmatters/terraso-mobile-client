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

import {useTranslation} from 'react-i18next';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';

import {theme} from 'terraso-mobile-client/theme';

/* Exported so the carousel can reserve a matching band of space inside each page. */
export const INDICATOR_HEIGHT = 32;

const DOT_SIZE = 7;
const DOT_GAP = 8;

export type CarouselPageIndicatorProps = {
  count: number;
  currentPage: number;
  style?: StyleProp<ViewStyle>;
};

/*
 * Row of dots marking position within a carousel. Non-interactive: it reports
 * position to screen readers but passes touches through to the pager
 * underneath, since it overlays the pager's swipe area.
 */
export const CarouselPageIndicator = ({
  count,
  currentPage,
  style,
}: CarouselPageIndicatorProps) => {
  const {t} = useTranslation();

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      <View
        accessible={true}
        accessibilityLabel={t('general.carousel.page_indicator', {
          current: currentPage + 1,
          total: count,
        })}
        accessibilityLiveRegion="polite"
        style={styles.dots}>
        {Array.from({length: count}, (_, index) => (
          <View
            key={index}
            style={[styles.dot, index === currentPage && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: INDICATOR_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    marginHorizontal: DOT_GAP / 2,
    backgroundColor: theme.colors.grey[300],
  },
  dotActive: {
    backgroundColor: theme.colors.text.primary,
  },
});
