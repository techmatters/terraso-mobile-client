import {StyleSheet, View as RNView, ViewProps} from 'react-native';
import {
  NativeBaseProps,
  useMemoizedNBStyles,
} from 'terraso-mobile-client/components/util/nativeBaseAdapters';
import {theme} from 'terraso-mobile-client/theme';

type Props = NativeBaseProps & ViewProps;
export const View = (props: React.PropsWithChildren<Props>) => (
  <RNView {...useMemoizedNBStyles(props, 'View')} />
);

type BoxProps = NativeBaseProps &
  ViewProps & {
    variant?: keyof (typeof theme.components)['Box']['variants'];
  };
export const Box = (props: React.PropsWithChildren<BoxProps>) => (
  <RNView {...useMemoizedNBStyles(props, 'Box')} />
);
type RowProps = NativeBaseProps &
  ViewProps & {
    variant?: keyof (typeof theme.components)['HStack']['variants'];
  };
export const Row = (props: React.PropsWithChildren<RowProps>) => {
  const memoizedProps = useMemoizedNBStyles(props, 'HStack');
  return (
    <RNView {...memoizedProps} style={[styles.row, memoizedProps?.style]} />
  );
};
export const HStack = (props: React.PropsWithChildren<RowProps>) => {
  const memoizedProps = useMemoizedNBStyles(props, 'HStack');
  return (
    <RNView {...memoizedProps} style={[styles.row, memoizedProps?.style]} />
  );
};
type ColumnProps = NativeBaseProps & ViewProps;
export const Column = (props: React.PropsWithChildren<ColumnProps>) => {
  const memoizedProps = useMemoizedNBStyles(props, 'Column');
  return (
    <RNView {...memoizedProps} style={[styles.column, memoizedProps?.style]} />
  );
};
export const VStack = (props: React.PropsWithChildren<ColumnProps>) => {
  const memoizedProps = useMemoizedNBStyles(props, 'VStack');
  return (
    <RNView {...memoizedProps} style={[styles.column, memoizedProps?.style]} />
  );
};

const styles = StyleSheet.create({
  row: {flexDirection: 'row'},
  column: {flexDirection: 'column'},
});
