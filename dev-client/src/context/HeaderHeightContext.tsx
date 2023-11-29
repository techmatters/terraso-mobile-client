import {createContext, useContext} from 'react';

export const HeaderHeightContext = createContext<number | undefined>(undefined);
export const useHeaderHeight = () => useContext(HeaderHeightContext);
