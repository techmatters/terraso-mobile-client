/*
 * Copyright © 2023 Technology Matters
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

import {Box} from 'native-base';
import {forwardRef} from 'react';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import {useHeaderHeight} from 'terraso-mobile-client/screens/ScreenScaffold';
import {CardCloseButton} from 'terraso-mobile-client/components/common/Card';
import {PrivacyInfoContent} from 'terraso-mobile-client/components/common/infoModals/PrivacyInfoContent';

export const InfoModal = forwardRef<BottomSheetModal, {onClose: () => void}>(
  ({onClose}, ref) => {
    const headerHeight = useHeaderHeight();
    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['100%']}
        handleComponent={null}
        topInset={headerHeight}
        backdropComponent={BackdropComponent}>
        <PrivacyInfoContent />
        <Box position="absolute" top="18px" right="23px">
          <CardCloseButton onPress={onClose} />
        </Box>
      </BottomSheetModal>
    );
  },
);

const BackdropComponent = (props: BottomSheetBackdropProps) => (
  <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} />
);
