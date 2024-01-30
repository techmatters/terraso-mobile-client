import {useMemo} from 'react';
import {StyleProp, ViewStyle} from 'react-native';
import {theme} from 'terraso-mobile-client/theme';

type PathOf<O extends Record<string, any>> = string &
  keyof {
    [P in keyof O as O[P] extends Record<string, any>
      ? `${P & string}.${string & PathOf<O[P]>}`
      : P]: true;
  };

type TypeAt<
  O extends Record<string, any>,
  K extends PathOf<O>,
> = K extends `${infer Head}.${infer Tail}`
  ? TypeAt<O[Head], PathOf<O[Head]> & Tail>
  : O[K];

export type ThemeColor = PathOf<typeof theme.colors>;

export const getByKey = <O extends Record<string, any>, K extends string>(
  object: O,
  key: K,
) =>
  key
    .split('.')
    .reduce(
      (o, k) => (typeof o === 'object' ? o[k] : undefined),
      object,
    ) as K extends PathOf<O> ? TypeAt<O, K> : undefined;

const nativeBaseDimensions = {
  mr: 'marginRight',
  mb: 'marginBottom',
  mt: 'marginTop',
  ml: 'marginLeft',
  mx: 'marginHorizontal',
  my: 'marginVertical',
  m: 'margin',
  pr: 'paddingRight',
  pb: 'paddingBottom',
  pt: 'paddingTop',
  pl: 'paddingLeft',
  px: 'paddingHorizontal',
  py: 'paddingVertical',
  p: 'padding',
  height: 'height',
  h: 'height',
  width: 'width',
  w: 'width',
} as const;

const nativeBaseDimensionsKeys = Object.keys(
  nativeBaseDimensions,
) as (keyof typeof nativeBaseDimensions)[];

export type NativeBaseProps = Partial<{
  [K in keyof typeof nativeBaseDimensions]: `${number}px` | number;
}>;

const rnDim = (dim: `${number}px` | number) =>
  typeof dim === 'number'
    ? dim
    : parseInt(dim.substring(0, dim.length - 2), 10);

const keys = <K extends string>(obj: Record<K, any>) => Object.keys(obj) as K[];

export const useMemoizedNBStyles = <Props extends NativeBaseProps>(
  props: Props,
): Omit<Props, keyof NativeBaseProps> =>
  useMemo(
    () => {
      const styleProp: ViewStyle = {};
      const remainingProps = {} as Omit<Props, keyof NativeBaseProps> & {
        style: StyleProp<ViewStyle>;
      };
      keys(props).forEach(k => {
        if (k in nativeBaseDimensions) {
          styleProp[nativeBaseDimensions[k]] = rnDim(props[k]);
        } else {
          remainingProps[k] = props[k];
        }
      });
      remainingProps.style = remainingProps.style
        ? [styleProp].concat(remainingProps.style)
        : styleProp;
      return remainingProps;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    nativeBaseDimensionsKeys.map(k => props[k]),
  );
