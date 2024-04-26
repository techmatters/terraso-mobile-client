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

type PathOf<Object extends Record<string, any>> = string &
  keyof {
    [Property in keyof Object as Object[Property] extends Record<string, any>
      ? `${Property & string}.${string & PathOf<Object[Property]>}`
      : Property]: true;
  };

type TypeAt<
  Object extends Record<string, any>,
  Key extends PathOf<Object>,
> = Key extends `${infer Head}.${infer Tail}`
  ? TypeAt<Object[Head], PathOf<Object[Head]> & Tail>
  : Object[Key];

export const getByKey = <Object extends Record<string, any>, Key>(
  object: Object,
  key: Key,
): Key extends PathOf<Object> ? TypeAt<Object, Key> : Key =>
  (typeof key === 'string'
    ? key.split('.').reduce((o, k) => o[k], object) ?? key
    : key) as Key extends PathOf<Object> ? TypeAt<Object, Key> : Key;

export type ThemeColor = PathOf<typeof theme.colors>;

export const getThemeColor = <Value extends ThemeColor | ColorValue>(
  color: Value,
): ColorValue => getByKey(theme.colors, color) as ColorValue;

export type ThemeSpace<Value extends DimensionValue> =
  | Value
  | PathOf<typeof theme.space>;

export const getThemeSpace = <Value extends ThemeSpace<DimensionValue>>(
  space: Value,
) => getByKey(theme.space, space) as Exclude<Value, PathOf<typeof theme.space>>;

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

export const convertThemedStyle = <Object extends object>(
  origProps: Object & ThemedViewStyle,
): {style: StyleProp<ViewStyle>; props: Object} => {
  let style: Record<string, any> = {};
  const props: Record<string, any> = {};
  for (const [key, value] of Object.entries(origProps)) {
    if (viewSpaceProps.has(key)) {
      style[key] = getThemeSpace(value as any);
    } else if (viewColorProps.has(key)) {
      style[key] = getThemeColor(value as any);
    } else if (viewStyleProps.has(key)) {
      style[key] = value;
    } else if (textStyleProps.has(key)) {
      style[key] = value;
    } else if (key !== 'style') {
      props[key] = value;
    }
  }
  if ('style' in origProps) {
    style = [style, origProps.style];
  }
  return {style, props: props as Object};
};
