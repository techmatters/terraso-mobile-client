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

import {forwardRef} from 'react';
import {StyleSheet, View} from 'react-native';

import {BottomSheetModal as GorhomBottomSheetModal} from '@gorhom/bottom-sheet';

import {BackdropComponent} from 'terraso-mobile-client/components/BackdropComponent';
import {BigCloseButton} from 'terraso-mobile-client/components/buttons/icons/common/BigCloseButton';
import {
  Carousel,
  CarouselPage,
  CarouselZoneHeight,
} from 'terraso-mobile-client/components/Carousel';
import {
  ModalContext,
  ModalHandle,
  ModalTrigger,
} from 'terraso-mobile-client/components/modals/Modal';
import {useGorhomSheetHandleRef} from 'terraso-mobile-client/components/sheets/hooks/gorhomHooks';
import {useHeaderHeight} from 'terraso-mobile-client/hooks/useHeaderHeight';

export type CarouselSheetProps = {
  pages: CarouselPage[];
  aboveHeight: CarouselZoneHeight;
  heading?: React.ReactNode;
  trigger?: ModalTrigger;
};

/*
 * Full-screen overlay sheet holding a swipeable carousel. Sibling to InfoSheet,
 * which scrolls its content as one column; here the carousel fills the sheet
 * and scrolls each page itself, so the content is not wrapped in a scroll view
 * (which would leave it unbounded vertically and collapse it to nothing). The
 * sheet's own pan gesture is off so it cannot compete with the carousel's
 * swipe; closing is via the header button.
 */
export const CarouselSheet = forwardRef<ModalHandle, CarouselSheetProps>(
  ({pages, aboveHeight, heading, trigger}: CarouselSheetProps, ref) => {
    const {headerHeight} = useHeaderHeight();
    const {sheetRef, handle} = useGorhomSheetHandleRef(ref);

    return (
      <>
        {trigger && trigger(handle.onOpen)}
        <GorhomBottomSheetModal
          ref={sheetRef}
          handleComponent={null}
          topInset={headerHeight}
          backdropComponent={BackdropComponent}
          snapPoints={['100%']}
          enableContentPanningGesture={false}
          enableDynamicSizing={false}>
          <ModalContext.Provider value={handle}>
            <View style={styles.content}>
              <View style={styles.headingRow}>
                <View style={styles.headingContent}>{heading}</View>
                <BigCloseButton onPress={handle.onClose} />
              </View>
              <Carousel pages={pages} aboveHeight={aboveHeight} />
            </View>
          </ModalContext.Provider>
        </GorhomBottomSheetModal>
      </>
    );
  },
);

const styles = StyleSheet.create({
  content: {
    padding: 16,
    flex: 1,
  },
  headingRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignContent: 'space-evenly',
    alignItems: 'center',
  },
  headingContent: {
    marginRight: 'auto',
    flex: 1,
  },
});
