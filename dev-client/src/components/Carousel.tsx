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

import {useCallback, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {AccessibilityInfo, Platform, StyleSheet, View} from 'react-native';
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
import {theme} from 'terraso-mobile-client/theme';

export type CarouselPage = {
  key: string;
  image: CarouselImageProps;
  /* Use CarouselHeading and CarouselText for consistent style */
  below: React.ReactNode;
};

/* A percentage resolves against the carousel's own height.
 * CarouselImage scales each page's art to fit it uncropped.
 */
const ABOVE_HEIGHT = '50%';

/* Roughly 60 characters at the copy's 20px type — the upper end of what reads comfortably. Relevant for tablets. */
const COPY_MAX_WIDTH = 600;

/* Owned here rather than by the host so the carousel keeps its margins wherever it is mounted. Applied per zone, since the indicator spans the full width between them. */
const ZONE_PADDING = theme.space.md;

export type CarouselProps = {
  pages: CarouselPage[];
  initialPage?: number;
  onPageChange?: (index: number) => void;
};

/*
 * Horizontally paged carousel with a page indicator sandwiched between each
 * page's art and its content.
 */
export const Carousel = ({
  pages,
  initialPage = 0,
  onPageChange,
}: CarouselProps) => {
  const {t} = useTranslation();
  const [currentPage, setCurrentPage] = useState(initialPage);

  const onPageSelected = useCallback(
    (event: PagerViewOnPageSelectedEvent) => {
      const {position} = event.nativeEvent;
      setCurrentPage(position);
      onPageChange?.(position);

      /* The indicator's accessibilityLiveRegion covers this on Android only, so iOS has to be told. Announcing here rather than from an effect on currentPage, which would also fire on mount and announce page 1 to someone who just opened the sheet. */
      if (Platform.OS === 'ios') {
        AccessibilityInfo.announceForAccessibility(
          t('general.carousel.page_indicator', {
            current: position + 1,
            total: pages.length,
          }),
        );
      }
    },
    [onPageChange, pages.length, t],
  );

  return (
    <View style={styles.container}>
      <PagerView
        style={styles.pager}
        initialPage={initialPage}
        onPageSelected={onPageSelected}>
        {pages.map(({key, image, below}) => (
          <View key={key} style={styles.page}>
            <View style={styles.above}>
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
        style={styles.indicator}
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
    height: ABOVE_HEIGHT,
    paddingHorizontal: ZONE_PADDING,
    overflow: 'hidden',
  },
  indicator: {
    top: ABOVE_HEIGHT,
  },
  page: {
    flex: 1,
  },
  indicatorSpacer: {
    height: INDICATOR_HEIGHT,
  },
  below: {
    maxWidth: COPY_MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: ZONE_PADDING,
  },
});
