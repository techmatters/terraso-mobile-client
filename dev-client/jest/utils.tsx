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
