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
import {useRef} from 'react';
import {Provider} from 'react-redux';

import {renderHook, render as rnRender} from '@testing-library/react-native';

import {AppWrappers} from 'terraso-mobile-client/app/AppWrappers';
import {
  RootStack,
  RootStackParamList,
} from 'terraso-mobile-client/navigation/types';
import {AppState, createStore} from 'terraso-mobile-client/store';

type WrapperProps = {
  initialState?: Partial<AppState>;
  route?: keyof RootStackParamList;
};

const TestWrapper = ({
  initialState,
  route,
  children,
}: React.PropsWithChildren<WrapperProps>) => {
  const store = useRef(createStore(initialState));
  return (
    <AppWrappers store={store.current}>
      {route && (
        <RootStack.Navigator>
          <RootStack.Screen name={route}>{() => children}</RootStack.Screen>
        </RootStack.Navigator>
      )}
      {!route && children}
    </AppWrappers>
  );
};

export const render = (
  ui: React.ReactElement,
  wrapperProps: WrapperProps = {},
) => {
  const Wrapper = ({children}: React.PropsWithChildren) => (
    <TestWrapper {...wrapperProps}>{children}</TestWrapper>
  );

  return rnRender(ui, {wrapper: Wrapper});
};

/* For unit-testing redux selectors; allows rendering a hook with a provided store state. */
export const renderSelectorHook = <Result,>(
  callback: () => Result,
  initialStoreState: Partial<AppState>,
) =>
  renderHook(callback, {
    wrapper: props => (
      <Provider store={createStore(initialStoreState)} {...props} />
    ),
  }).result.current;
