import createStoreFactory, {
  StateFromStoreFactory,
  DispatchFromStoreFactory,
} from 'terraso-client-shared/store/store';
import {
  useDispatch as reduxUseDispatch,
  useSelector as reduxUseSelector,
  TypedUseSelectorHook,
} from 'react-redux';
import mapReducer from './map/mapSlice';
import {StateFromReducersMapObject} from '@reduxjs/toolkit';

type LandPksState = StateFromReducersMapObject<typeof reducers>;
export type AppState = StateFromStoreFactory<typeof createStore> & LandPksState;
export type AppDispatch = DispatchFromStoreFactory<typeof createStore>;

export const useSelector: TypedUseSelectorHook<AppState> = reduxUseSelector;
export const useDispatch: () => AppDispatch = reduxUseDispatch;

const reducers = {map: mapReducer};

export const createStore = createStoreFactory(reducers);
