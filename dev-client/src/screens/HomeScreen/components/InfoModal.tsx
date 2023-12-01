import {forwardRef} from 'react';
import {Box} from 'native-base';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {useHeaderHeight} from 'terraso-mobile-client/hooks/useHeaderHeight';
import {CardCloseButton} from 'terraso-mobile-client/components/CardCloseButton';
import {LandPKSInfo} from 'terraso-mobile-client/screens/HomeScreen/components/LandPKSInfo';
import {BackdropComponent} from 'terraso-mobile-client/components/BackdropComponent';

type Props = {
  onClose: () => void;
};

export const InfoModal = forwardRef<BottomSheetModal, Props>(
  ({onClose}, ref) => {
    const headerHeight = useHeaderHeight();

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={['100%']}
        handleComponent={null}
        topInset={headerHeight}
        backdropComponent={BackdropComponent}>
        <LandPKSInfo />
        <Box position="absolute" top="18px" right="23px">
          <CardCloseButton onPress={onClose} />
        </Box>
      </BottomSheetModal>
    );
  },
);
