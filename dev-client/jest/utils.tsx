/*
 * Copyright © ${YEAR} Technology Matters
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
import {render} from '@testing-library/react-native';
import {NativeBaseProvider} from 'native-base';
import {theme} from 'terraso-mobile-client/theme';

// NativeBase: https://docs.nativebase.io/testing
const nativeBaseInset = {
  frame: {x: 0, y: 0, width: 0, height: 0},
  insets: {top: 0, left: 0, right: 0, bottom: 0},
};

const TestWrapper = ({children}: React.PropsWithChildren) => {
  return (
    <NativeBaseProvider theme={theme} initialWindowMetrics={nativeBaseInset}>
      {children}
    </NativeBaseProvider>
  );
};

export const customRender: typeof render = (ui, options) => {
  return render(ui, {wrapper: TestWrapper, ...options});
};
