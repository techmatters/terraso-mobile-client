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
import {
  PathOf,
  getByKey,
  setHas,
} from 'terraso-mobile-client/theme/themeManipulations';
import {
  ViewColorKey,
  ViewSpaceKey,
  textStyleKeys,
  viewColorKeys,
  viewSpaceKeys,
  viewStyleKeys,
} from 'terraso-mobile-client/theme/styleKeyLists';

export type ThemeColor = PathOf<typeof theme.colors>;

export type ThemeColorProps = {
  [K in ViewColorKey]?: ThemeColor;
};

export const getThemeColor = <Value extends ThemeColor | ColorValue>(
  color: Value,
): ColorValue => getByKey(theme.colors, color) as ColorValue;

export type ThemeSpace<Value extends DimensionValue> =
  | Value
  | PathOf<typeof theme.space>;

export type ThemeSpaceProps = {
  [K in ViewSpaceKey]?: ThemeSpace<Exclude<ViewStyle[K], undefined>>;
};

export const getThemeSpace = <Value extends ThemeSpace<DimensionValue>>(
  space: Value,
) => getByKey(theme.space, space) as Exclude<Value, PathOf<typeof theme.space>>;

export type ThemedTextStyle = ThemedViewStyle &
  Omit<TextStyle, 'color' | ViewColorKey | ViewSpaceKey> & {color?: ThemeColor};

export type ThemedViewStyle = ThemeSpaceProps &
  ThemeColorProps &
  Omit<ViewStyle, ViewColorKey | ViewSpaceKey>;

export const convertThemedStyle = <Object extends object>(
  origProps: Object & ThemedTextStyle,
): {style: StyleProp<TextStyle>; props: Object} => {
  let style: Record<string, any> = {};
  const props: Partial<Object> = {};
  const keys = Object.keys(origProps) as unknown as (keyof (Object &
    ThemedTextStyle))[];
  for (const key of keys) {
    if (setHas(viewSpaceKeys, key)) {
      const value = origProps[key];
      if (value !== undefined) {
        style[key] = getThemeSpace(value);
      }
    } else if (setHas(viewColorKeys, key)) {
      const value = origProps[key];
      if (value !== undefined) {
        style[key] = getThemeColor(value);
      }
    } else if (setHas(viewStyleKeys, key)) {
      style[key] = origProps[key];
    } else if (setHas(textStyleKeys, key)) {
      style[key] = origProps[key];
    } else if (key !== 'style') {
      props[key] = origProps[key];
    }
  }
  if ('style' in origProps) {
    style = [style, origProps.style];
  }
  return {style, props: props as Object};
};
