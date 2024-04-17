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

import {
  ColorValue,
  DimensionValue,
  StyleProp,
  TextStyle,
  ViewStyle,
} from 'react-native';
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

export const getByKey = <O extends Record<string, any>, K>(
  object: O,
  key: K,
): K extends PathOf<O> ? TypeAt<O, K> : K =>
  (typeof key === 'string'
    ? key.split('.').reduce((o, k) => o[k], object) ?? key
    : key) as K extends PathOf<O> ? TypeAt<O, K> : K;

export type ThemeColor = PathOf<typeof theme.colors>;

export const getThemeColor = <K extends ThemeColor | ColorValue>(
  color: K,
): ColorValue => getByKey(theme.colors, color) as ColorValue;

export type ThemeSpace<T extends DimensionValue> =
  | T
  | PathOf<typeof theme.space>;

export const getThemeSpace = <T extends ThemeSpace<DimensionValue>>(space: T) =>
  getByKey(theme.space, space) as Exclude<T, PathOf<typeof theme.space>>;

type ThemeSpaceProp = Parameters<typeof viewSpaceProps.has>[0];
export type ThemeSpaceProps = {
  [K in ThemeSpaceProp]?: ThemeSpace<Exclude<ViewStyle[K], undefined>>;
};
const viewSpaceProps = new Set([
  'bottom',
  'end',
  'flexBasis',
  'rowGap',
  'gap',
  'columnGap',
  'height',
  'left',
  'margin',
  'marginBottom',
  'marginEnd',
  'marginHorizontal',
  'marginLeft',
  'marginRight',
  'marginStart',
  'marginTop',
  'marginVertical',
  'maxHeight',
  'maxWidth',
  'minHeight',
  'minWidth',
  'padding',
  'paddingBottom',
  'paddingEnd',
  'paddingHorizontal',
  'paddingLeft',
  'paddingRight',
  'paddingStart',
  'paddingTop',
  'paddingVertical',
  'right',
  'start',
  'top',
  'width',
] as const satisfies readonly (keyof ViewStyle)[]);

type ThemeColorProp = Parameters<typeof viewColorProps.has>[0];
export type ThemeColorProps = {
  [K in ThemeColorProp]?: ThemeColor;
};
const viewColorProps = new Set([
  'backgroundColor',
  'borderBlockColor',
  'borderBlockEndColor',
  'borderBlockStartColor',
  'borderBottomColor',
  'borderColor',
  'borderEndColor',
  'borderLeftColor',
  'borderRightColor',
  'borderStartColor',
  'borderTopColor',
] as const satisfies readonly (keyof ViewStyle)[]);

const viewStyleProps = new Set([
  'alignContent',
  'alignItems',
  'alignSelf',
  'aspectRatio',
  'borderBottomWidth',
  'borderEndWidth',
  'borderLeftWidth',
  'borderRightWidth',
  'borderStartWidth',
  'borderTopWidth',
  'borderWidth',
  'display',
  'flex',
  'flexDirection',
  'flexGrow',
  'flexShrink',
  'flexWrap',
  'justifyContent',
  'overflow',
  'position',
  'zIndex',
  'direction',
  'backfaceVisibility',
  'borderBottomEndRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'borderBottomStartRadius',
  'borderCurve',
  'borderEndEndRadius',
  'borderEndStartRadius',
  'borderRadius',
  'borderStartEndRadius',
  'borderStartStartRadius',
  'borderStyle',
  'borderTopEndRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderTopStartRadius',
  'opacity',
  'elevation',
  'pointerEvents',
] as const satisfies readonly Exclude<
  keyof ViewStyle,
  ThemeColorProp | ThemeSpaceProp
>[]);

const textStyleProps = new Set([
  'color',
  'fontFamily',
  'fontSize',
  'fontStyle',
  'fontWeight',
  'letterSpacing',
  'lineHeight',
  'textAlign',
  'textDecorationLine',
  'textDecorationStyle',
  'textDecorationColor',
  'textShadowColor',
  'textShadowOffset',
  'textShadowRadius',
  'textTransform',
  'userSelect',
] as const);

export type ThemedTextStyle = ThemedViewStyle &
  Omit<TextStyle, 'color'> & {color: ThemeColor};

export type ThemedViewStyle = ThemeSpaceProps &
  ThemeColorProps &
  Omit<ViewStyle, ThemeColorProp | ThemeSpaceProp>;

export const convertThemedStyle = <T extends object>(
  origProps: T & ThemedViewStyle,
): {style: StyleProp<ViewStyle>; props: T} => {
  let style: Record<string, any> = {};
  const props: Record<string, any> = {};
  for (const [key, value] of Object.entries(origProps)) {
    if (key in viewSpaceProps) {
      style[key] = getThemeSpace(value as any);
    } else if (key in viewColorProps) {
      style[key] = getThemeColor(value as any);
    } else if (key in viewStyleProps) {
      style[key] = value;
    } else if (key in textStyleProps) {
      style[key] = value;
    } else if (key !== 'style') {
      props[key] = value;
    }
  }
  if ('style' in origProps) {
    style = [style, origProps.style];
  }
  return {style, props: props as T};
};
