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

import {useCallback, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import PagerView, {PagerViewOnPageSelectedEvent} from 'react-native-pager-view';

import {
  CarouselPageIndicator,
  INDICATOR_HEIGHT,
} from 'terraso-mobile-client/components/CarouselPageIndicator';

export type CarouselPage = {
  key: string;
  above: React.ReactNode;
  below: React.ReactNode;
};

export type CarouselProps = {
  pages: CarouselPage[];
  /* Both zones live in a single pager so they stay in sync, so this is what fixes the indicator's vertical position across pages. Without a known height the dots would drift with each page's content. */
  aboveHeight: number;
  initialPage?: number;
  onPageChange?: (index: number) => void;
};

/*
 * Horizontally paged carousel with a page indicator sandwiched between two
 * per-page content zones. The zone above the indicator is a fixed height; the
 * zone below takes the remaining space and scrolls internally when its content
 * overflows, so long copy degrades gracefully on short devices instead of
 * squashing the artwork.
 */
export const Carousel = ({
  pages,
  aboveHeight,
  initialPage = 0,
  onPageChange,
}: CarouselProps) => {
  const [currentPage, setCurrentPage] = useState(initialPage);

  const onPageSelected = useCallback(
    (event: PagerViewOnPageSelectedEvent) => {
      const {position} = event.nativeEvent;
      setCurrentPage(position);
      onPageChange?.(position);
    },
    [onPageChange],
  );

  const aboveStyle = useMemo(() => ({height: aboveHeight}), [aboveHeight]);
  const indicatorStyle = useMemo(() => ({top: aboveHeight}), [aboveHeight]);

  return (
    <View style={styles.container}>
      <PagerView
        style={styles.pager}
        initialPage={initialPage}
        onPageSelected={onPageSelected}>
        {pages.map(({key, above, below}) => (
          <View key={key} style={styles.page}>
            <View style={aboveStyle}>{above}</View>
            {/* Holds open the band the indicator is absolutely positioned over. */}
            <View style={styles.indicatorSpacer} />
            <ScrollView>{below}</ScrollView>
          </View>
        ))}
      </PagerView>
      {/* Sits outside the pager so it stays put while pages swipe beneath it. */}
      <CarouselPageIndicator
        style={indicatorStyle}
        count={pages.length}
        currentPage={currentPage}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  indicatorSpacer: {
    height: INDICATOR_HEIGHT,
  },
});
