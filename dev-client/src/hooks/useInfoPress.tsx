import {useContext} from 'react';
import {BottomSheetPrivacyModalContext} from 'terraso-mobile-client/context/BottomSheetPrivacyModalContext';

export const useInfoPress = () => useContext(BottomSheetPrivacyModalContext);
