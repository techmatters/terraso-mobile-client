import {createContext, Dispatch, SetStateAction, useContext} from 'react';

import type {ColorAnalysisProps} from 'terraso-mobile-client/screens/ColorAnalysisScreen/ColorAnalysisScreen';
import {CropResult} from 'terraso-mobile-client/screens/ColorAnalysisScreen/components/ColorCropScreen';

export type ColorAnalysisContextState = {
  reference?: CropResult;
  soil?: CropResult;
};

type ColorAnalysisContextType = ColorAnalysisProps & {
  state: ColorAnalysisContextState;
  setState: Dispatch<SetStateAction<ColorAnalysisContextState>>;
};

export const ColorAnalysisContext = createContext<
  ColorAnalysisContextType | undefined
>(undefined);

export const useColorAnalysisContext = () => useContext(ColorAnalysisContext)!;
