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
