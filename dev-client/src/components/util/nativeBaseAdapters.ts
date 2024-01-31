/*
 * Copyright © 2024 Technology Matters
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

import {useMemo} from 'react';
import {ColorValue, DimensionValue, StyleProp, ViewStyle} from 'react-native';
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
  marginTop: 'marginTop',
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
  padding: 'padding',
  height: 'height',
  minHeight: 'minHeight',
  h: 'height',
  width: 'width',
  w: 'width',
  borderBottomWidth: 'borderBottomWidth',
  borderLeftWidth: 'borderLeftWidth',
  borderRightWidth: 'borderRightWidth',
  borderRadius: 'borderRadius',
  space: 'columnGap',
  left: 'left',
  top: 'top',
  right: 'right',
  bottom: 'bottom',
} as const;

const nativeBaseStyleProps = {
  alignItems: 'alignItems',
  alignSelf: 'alignSelf',
  justifyContent: 'justifyContent',
  position: 'position',
  flex: 'flex',
  flexGrow: 'flexGrow',
  flexDirection: 'flexDirection',
  flexShrink: 'flexShrink',
  flexBasis: 'flexBasis',
  zIndex: 'zIndex',
  display: 'display',
};

const nativeBaseColorProps = {
  bg: 'backgroundColor',
  bgColor: 'backgroundColor',
  backgroundColor: 'backgroundColor',
  borderBottomColor: 'borderBottomColor',
  borderLeftColor: 'borderLeftColor',
  borderRightColor: 'borderRightColor',
};

type NBDimensionValue =
  | `${number}px`
  | number
  | DimensionValue
  | keyof typeof theme.space;
export type NativeBaseProps = Partial<
  {
    [K in keyof typeof nativeBaseDimensions]: NBDimensionValue;
  } & {[K in keyof typeof nativeBaseStyleProps]: ViewStyle[K]} & {
    [K in keyof typeof nativeBaseColorProps]: ThemeColor | ColorValue;
  } & {
    shadow: keyof typeof theme.shadows | number;
  }
>;

export const convertDimensionProp = (dim: NBDimensionValue) => {
  if (typeof dim !== 'string') {
    if (typeof dim === 'number') {
      if (dim.toFixed(0) in theme.space) {
        return theme.space[dim.toFixed(0) as keyof typeof theme.space];
      }
    }
    return dim;
  }
  if (dim in theme.space) {
    return theme.space[dim as keyof typeof theme.space];
  }
  if (dim.endsWith('px')) {
    return parseInt(dim.substring(0, dim.length - 2), 10);
  }
  if (dim.endsWith('%')) {
    return dim;
  }
};

export const convertColorProp = (color: ColorValue | ThemeColor | undefined) =>
  typeof color === 'string' ? getByKey(theme.colors, color) ?? color : color;

const keys = <K extends string>(obj: Record<K, any>) => Object.keys(obj) as K[];

export const useMemoizedNBStyles = <Props extends NativeBaseProps>(
  props: Props,
  component?: string,
): Omit<Props, keyof NativeBaseProps> => {
  const styleProp: ViewStyle = {};
  const remainingProps = {} as Omit<Props, keyof NativeBaseProps> & {
    style: StyleProp<ViewStyle>;
  };
  if (
    component &&
    component in theme.components &&
    theme.components[component].variants &&
    'variant' in props &&
    theme.components[component].variants[props.variant]
  ) {
    props = {
      ...theme.components[component].variants[props.variant],
      ...props,
    };
  }
  keys(props).forEach(k => {
    if (k in nativeBaseDimensions) {
      let dim = nativeBaseDimensions[k as keyof typeof nativeBaseDimensions];
      if (k === 'space') {
        if (component === 'Column' || component === 'VStack') {
          dim = 'rowGap';
        }
      }
      styleProp[dim] = convertDimensionProp(props[k]);
    } else if (k in nativeBaseStyleProps) {
      styleProp[nativeBaseStyleProps[k]] = props[k];
    } else if (k in nativeBaseColorProps) {
      styleProp[nativeBaseColorProps[k]] = convertColorProp(props[k]);
    } else if (k === 'shadow') {
      let shadow: string | number | undefined = props[k];
      if (typeof shadow === 'number') {
        shadow = shadow.toFixed(0);
      }
      if (shadow !== undefined) {
        Object.assign(styleProp, theme.shadows[shadow]);
      }
    } else {
      remainingProps[k] = props[k];
    }
  });
  remainingProps.style = remainingProps.style
    ? [styleProp].concat(remainingProps.style)
    : styleProp;
  return remainingProps;
};
