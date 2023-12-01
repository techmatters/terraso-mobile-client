import {useContext} from 'react';
import {HeaderHeightContext} from '../context/HeaderHeightContext';

export const useHeaderHeight = () => useContext(HeaderHeightContext);
