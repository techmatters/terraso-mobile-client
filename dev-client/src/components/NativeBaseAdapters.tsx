import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
} from 'react';
import * as RN from 'react-native';
import {
  NativeBaseProps,
  NativeBaseTextProps,
  convertNBStyles,
} from 'terraso-mobile-client/components/util/nativeBaseAdapters';
import {theme} from 'terraso-mobile-client/theme';
import {IconProps} from 'terraso-mobile-client/components/Icons';

const withProps = (node: React.ReactNode, props: object | undefined) =>
  !isValidElement(node) || props === undefined
    ? node
    : Children.map(node, child =>
        cloneElement(child, {...props, ...child.props}),
      );

type ViewProps = NativeBaseProps & RN.ViewProps;
export const View = (props: React.PropsWithChildren<ViewProps>) => (
  <RN.View {...convertNBStyles(props, 'View')} />
);

type BoxProps = NativeBaseProps &
  RN.ViewProps & {
    variant?: keyof (typeof theme.components)['Box']['variants'];
  };
export const Box = (props: React.PropsWithChildren<BoxProps>) => (
  <RN.View {...convertNBStyles(props, 'Box')} />
);
type RowProps = NativeBaseProps &
  RN.ViewProps & {
    variant?: keyof (typeof theme.components)['HStack']['variants'];
  };
export const Row = (props: React.PropsWithChildren<RowProps>) => {
  const memoizedProps = convertNBStyles(props, 'HStack');
  return (
    <RN.View {...memoizedProps} style={[styles.row, memoizedProps?.style]} />
  );
};
export const HStack = (props: React.PropsWithChildren<RowProps>) => {
  const memoizedProps = convertNBStyles(props, 'HStack');
  return (
    <RN.View {...memoizedProps} style={[styles.row, memoizedProps?.style]} />
  );
};
type ColumnProps = NativeBaseProps & RN.ViewProps;
export const Column = (props: React.PropsWithChildren<ColumnProps>) => {
  const memoizedProps = convertNBStyles(props, 'VStack');
  return (
    <RN.View {...memoizedProps} style={[styles.column, memoizedProps?.style]} />
  );
};
export const VStack = (props: React.PropsWithChildren<ColumnProps>) => {
  const memoizedProps = convertNBStyles(props, 'VStack');
  return (
    <RN.View {...memoizedProps} style={[styles.column, memoizedProps?.style]} />
  );
};

const TextAncestorContext = createContext(false);
type TextProps = NativeBaseTextProps &
  RN.TextProps & {
    variant?: keyof (typeof theme.components)['Text']['variants'];
  };

export const Text = ({...props}: React.PropsWithChildren<TextProps>) => {
  const hasTextAncestor = useContext(TextAncestorContext);
  return (
    <TextAncestorContext.Provider value={true}>
      <RN.Text
        {...convertNBStyles(
          {
            ...(hasTextAncestor
              ? {}
              : {variant: 'body1', color: 'text.primary'}),
            ...props,
          },
          'Text',
        )}
      />
    </TextAncestorContext.Provider>
  );
};

type HeadingProps = NativeBaseTextProps &
  RN.TextProps & {
    variant?: keyof (typeof theme.components)['Heading']['variants'];
  };

export const Heading = (props: React.PropsWithChildren<HeadingProps>) => (
  <RN.Text
    {...convertNBStyles(
      {
        variant: 'h6',
        color: 'text.primary',
        ...props,
      },
      'Heading',
    )}
  />
);

type BadgeProps = NativeBaseProps &
  RN.ViewProps & {
    variant?: keyof (typeof theme.components)['Badge']['variants'];
    startIcon?: React.ReactNode;
    _text?: TextProps;
    _icon?: IconProps;
  };
export const Badge = ({
  _text,
  _icon,
  startIcon,
  children,
  ...props
}: React.PropsWithChildren<BadgeProps>) => (
  <RN.View {...convertNBStyles({style: styles.badge, ...props}, 'Badge')}>
    {withProps(startIcon, _icon)}
    <Text {..._text}>{children}</Text>
  </RN.View>
);

const styles = RN.StyleSheet.create({
  row: {flexDirection: 'row'},
  column: {flexDirection: 'column'},
  badge: {
    flexDirection: 'row',
    justifyContent: 'center',
    columnGap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignItems: 'center',
  },
});
