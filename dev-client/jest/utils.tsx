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
import {Portal} from 'react-native-paper';
import {Provider} from 'react-redux';

import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {NavigationContainer} from '@react-navigation/native';
import {render as rnRender} from '@testing-library/react-native';
import {NativeBaseProvider} from 'native-base';

import {
  RootStack,
  RootStackParamList,
} from 'terraso-mobile-client/navigation/types';
import {AppState, createStore} from 'terraso-mobile-client/store';
import {theme} from 'terraso-mobile-client/theme';

// NativeBase: https://docs.nativebase.io/testing
const nativeBaseInset = {
  frame: {x: 0, y: 0, width: 0, height: 0},
  insets: {top: 0, left: 0, right: 0, bottom: 0},
};

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
    <Provider store={store.current}>
      <NavigationContainer>
        <NativeBaseProvider
          theme={theme}
          initialWindowMetrics={nativeBaseInset}>
          <BottomSheetModalProvider>
            <Portal.Host>
              {route && (
                <RootStack.Navigator>
                  <RootStack.Screen name={route}>
                    {() => children}
                  </RootStack.Screen>
                </RootStack.Navigator>
              )}
              {!route && children}
            </Portal.Host>
          </BottomSheetModalProvider>
        </NativeBaseProvider>
      </NavigationContainer>
    </Provider>
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
