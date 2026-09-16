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
import {StyleSheet, View} from 'react-native';
import PagerView, {PagerViewOnPageSelectedEvent} from 'react-native-pager-view';

import {
  CarouselImage,
  CarouselImageProps,
} from 'terraso-mobile-client/components/CarouselImage';
import {
  CarouselPageIndicator,
  INDICATOR_HEIGHT,
} from 'terraso-mobile-client/components/CarouselPageIndicator';
import {BottomInsetScrollView} from 'terraso-mobile-client/components/safeview/BottomInsetScrollView';

export type CarouselPage = {
  key: string;
  image: CarouselImageProps;
  /* Standards for text in the 'below' section:
   * - Use h5 for header, and center it
   * - Use pCarousel for body text
   */
  below: React.ReactNode;
};

/* A percentage resolves against the carousel's own height.
 * CarouselImage scales each page's art to fit it uncropped.
 */
export type CarouselZoneHeight = number | `${number}%`;

/* Roughly 60 characters at the copy's 20px type — the upper end of what reads comfortably. Relevant for tablets. */
const COPY_MAX_WIDTH = 600;

export type CarouselProps = {
  pages: CarouselPage[];
  aboveHeight: CarouselZoneHeight;
  initialPage?: number;
  onPageChange?: (index: number) => void;
};

/*
 * Horizontally paged carousel with a page indicator sandwiched between each
 * page's art and its content.
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

  const aboveStyle = useMemo(
    () => [styles.above, {height: aboveHeight}],
    [aboveHeight],
  );
  const indicatorStyle = useMemo(() => ({top: aboveHeight}), [aboveHeight]);

  return (
    <View style={styles.container}>
      <PagerView
        style={styles.pager}
        initialPage={initialPage}
        onPageSelected={onPageSelected}>
        {pages.map(({key, image, below}) => (
          <View key={key} style={styles.page}>
            <View style={aboveStyle}>
              <CarouselImage {...image} />
            </View>
            {/* Holds open the band the indicator is absolutely positioned over. */}
            <View style={styles.indicatorSpacer} />
            <BottomInsetScrollView contentContainerStyle={styles.below}>
              {below}
            </BottomInsetScrollView>
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
  /* Clips oversized art so it cannot bleed over the indicator band and the copy below it. */
  above: {
    overflow: 'hidden',
  },
  page: {
    flex: 1,
  },
  indicatorSpacer: {
    height: INDICATOR_HEIGHT,
  },
  /* Caps the line length on tablets, where full-width copy runs far past the ~60 characters a reader tracks comfortably. Never binds on phones, which are narrower than this. width is restored because alignSelf drops the container's default stretch. */
  below: {
    maxWidth: COPY_MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
  },
});
