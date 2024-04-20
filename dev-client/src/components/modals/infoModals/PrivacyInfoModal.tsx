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
import {forwardRef} from 'react';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {PrivacyInfoContent} from 'terraso-mobile-client/components/modals/infoModals/PrivacyInfoContent';
import {useHeaderHeight} from 'terraso-mobile-client/hooks/useHeaderHeight';
import {CardCloseButton} from 'terraso-mobile-client/components/CardCloseButton';
import {BackdropComponent} from 'terraso-mobile-client/components/BackdropComponent';
import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';

type Props = {onClose: () => void};

export const PrivacyInfoModal = forwardRef<BottomSheetModal, Props>(
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
