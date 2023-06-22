import createStoreFactory, {
  StateFromStoreFactory,
  DispatchFromStoreFactory,
} from 'terraso-client-shared/store/store';
import {
  useDispatch as reduxUseDispatch,
  useSelector as reduxUseSelector,
  TypedUseSelectorHook,
} from 'react-redux';

export type AppState = StateFromStoreFactory<typeof createStore>;
export type AppDispatch = DispatchFromStoreFactory<typeof createStore>;

export const useSelector: TypedUseSelectorHook<AppState> = reduxUseSelector;
export const useDispatch: () => AppDispatch = reduxUseDispatch;

export const createStore = createStoreFactory({});
