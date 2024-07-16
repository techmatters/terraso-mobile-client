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

import {ColorValue, DimensionValue, TextStyle, ViewStyle} from 'react-native';

import {entries, fromEntries} from 'terraso-client-shared/utils';

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

type Variants = {
  [K in keyof typeof theme.components]: 'variants' extends keyof (typeof theme.components)[K]
    ? (typeof theme.components)[K]['variants']
    : never;
};

type NBComponent = keyof typeof theme.components;

const nativeBaseDimensions = {
  mr: 'marginRight',
  mb: 'marginBottom',
  mt: 'marginTop',
  marginTop: 'marginTop',
  ml: 'marginLeft',
  mx: 'marginHorizontal',
  marginHorizontal: 'marginHorizontal',
  my: 'marginVertical',
  m: 'margin',
  margin: 'margin',
  pr: 'paddingRight',
  pb: 'paddingBottom',
  pt: 'paddingTop',
  pl: 'paddingLeft',
  px: 'paddingHorizontal',
  paddingHorizontal: 'paddingHorizontal',
  py: 'paddingVertical',
  paddingVertical: 'paddingVertical',
  p: 'padding',
  padding: 'padding',
  height: 'height',
  minHeight: 'minHeight',
  maxHeight: 'maxHeight',
  h: 'height',
  width: 'width',
  maxWidth: 'maxWidth',
  w: 'width',
  left: 'left',
  top: 'top',
  right: 'right',
  bottom: 'bottom',
} as const;

const nativeBaseNumerics = {
  borderTopWidth: 'borderTopWidth',
  borderBottomWidth: 'borderBottomWidth',
  borderLeftWidth: 'borderLeftWidth',
  borderRightWidth: 'borderRightWidth',
  borderRadius: 'borderRadius',
  borderWidth: 'borderWidth',
  space: 'columnGap',
} as const;

const nativeBaseStyleProps = {
  alignItems: 'alignItems',
  alignSelf: 'alignSelf',
  justifyContent: 'justifyContent',
  position: 'position',
  flex: 'flex',
  flexWrap: 'flexWrap',
  flexGrow: 'flexGrow',
  flexDirection: 'flexDirection',
  flexShrink: 'flexShrink',
  flexBasis: 'flexBasis',
  zIndex: 'zIndex',
  display: 'display',
  textAlign: 'textAlign',
  textTransform: 'textTransform',
  fontStyle: 'fontStyle',
  borderStyle: 'borderStyle',
  aspectRatio: 'aspectRatio',
  overflow: 'overflow',
  columnGap: 'columnGap',
  rowGap: 'rowGap',
};

const nativeBaseColorProps = {
  color: 'color',
  bg: 'backgroundColor',
  bgColor: 'backgroundColor',
  backgroundColor: 'backgroundColor',
  borderBottomColor: 'borderBottomColor',
  borderLeftColor: 'borderLeftColor',
  borderRightColor: 'borderRightColor',
  borderColor: 'borderColor',
};

const nativeBaseSpecialProps = {
  rounded: (rounded: keyof typeof theme.radii) => ({
    borderRadius: theme.radii[rounded],
  }),
  shadow: (shadow: keyof typeof theme.shadows | number) => {
    if (typeof shadow === 'number') {
      shadow = shadow.toFixed(0) as keyof typeof theme.shadows;
    }
    return theme.shadows[shadow];
  },
  bold: (bold: boolean) => (bold ? {fontWeight: 'bold'} : {}),
  italic: (italic: boolean) => (italic ? {fontStyle: 'italic'} : {}),
  underline: (underline: boolean) =>
    underline ? {textDecorationLine: 'underline'} : {},
  fontWeight: (weight: number | 'bold') => ({
    fontWeight:
      typeof weight === 'string' ? weight : (weight.toFixed(0) as any),
  }),
  fontSize: (fontSize: keyof typeof theme.fontSizes | `${number}px`) => ({
    fontSize:
      fontSize in theme.fontSizes
        ? theme.fontSizes[fontSize as keyof typeof theme.fontSizes]
        : parseInt(fontSize.slice(0, -2), 10),
  }),
} as const satisfies PropMappers;

const nativeBaseTextProps = {
  size: (size: keyof typeof theme.fontSizes | `${number}px`) =>
    nativeBaseSpecialProps.fontSize(size),
} as const satisfies PropMappers;

type PropMappers = Record<string, (_: any) => ViewStyle | TextStyle>;

type PropsOf<PM extends PropMappers> = {
  [K in keyof PM]?: Parameters<PM[K]>[0];
};

export type NBDimensionValue =
  | `${number}px`
  | number
  | NonNullable<DimensionValue>
  | keyof typeof theme.space;
export type NativeBaseProps = Partial<
  {
    [K in keyof (typeof nativeBaseDimensions &
      typeof nativeBaseNumerics)]: NBDimensionValue;
  } & {[K in keyof typeof nativeBaseStyleProps]: (ViewStyle & TextStyle)[K]} & {
    [K in keyof typeof nativeBaseColorProps]: ThemeColor | ColorValue;
  } & PropsOf<typeof nativeBaseSpecialProps>
>;

export type NativeBaseTextProps = NativeBaseProps &
  PropsOf<typeof nativeBaseTextProps>;

export const convertDimensionProp = (
  dim: NBDimensionValue,
): NonNullable<DimensionValue> | undefined => {
  if (typeof dim !== 'string') {
    if (typeof dim === 'number') {
      if (dim.toFixed(0) in theme.space) {
        return theme.space[
          dim.toFixed(0) as keyof typeof theme.space
        ] as NonNullable<DimensionValue>;
      }
    }
    return dim;
  }
  if (dim in theme.space) {
    return theme.space[
      dim as keyof typeof theme.space
    ] as NonNullable<DimensionValue>;
  }
  if (dim.endsWith('px')) {
    return parseInt(dim.substring(0, dim.length - 2), 10);
  }
  if (dim.endsWith('%')) {
    return dim as NonNullable<DimensionValue>;
  }
};

export const convertColorProp = (color: ColorValue | ThemeColor | undefined) =>
  typeof color === 'string' ? (getByKey(theme.colors, color) ?? color) : color;

const keys = <O extends object>(obj: O) => Object.keys(obj) as (keyof O)[];

export const convertNBStyles = <
  Props extends NativeBaseProps,
  Component extends NBComponent,
  SubProps extends string = never,
>(
  {variant, ...props}: Props & {variant?: keyof Variants[Component]},
  component?: Component,
  subProps?: Record<SubProps, any>,
): Omit<Props, keyof NativeBaseProps> & Record<SubProps, any> => {
  if (component && component in theme.components) {
    const componentTheme = theme.components[component];
    let baseSubProps: any;
    let variantSubProps: any;
    if ('baseStyle' in componentTheme) {
      let baseTheme = componentTheme.baseStyle;
      if (subProps !== undefined) {
        baseSubProps = fromEntries(
          entries(baseTheme as any).filter(([k]) => k in subProps!),
        );
        baseTheme = fromEntries(
          entries(baseTheme as any).filter(([k]) => !(k in subProps!)),
        );
      }
      props = {
        ...baseTheme,
        ...props,
      };
    }
    if (
      variant &&
      'variants' in componentTheme &&
      variant in componentTheme.variants
    ) {
      const variants = componentTheme.variants;
      let variantTheme = (variants as any)[variant];
      if (subProps !== undefined) {
        variantSubProps = fromEntries(
          entries(variantTheme).filter(([k]) => k in subProps!),
        );
        variantTheme = fromEntries(
          entries(variantTheme).filter(([k]) => !(k in subProps!)),
        );
      }
      props = {
        ...variantTheme,
        ...props,
      };
    }
    if (subProps !== undefined) {
      subProps = fromEntries(
        entries(subProps!).map(([k, v]) => [
          k,
          {...baseSubProps[k], ...variantSubProps[k], ...v},
        ]),
      );
    }
  }

  const styleProp: ViewStyle = {};
  const remainingProps: any = subProps ?? {};

  keys(props).forEach(k => {
    const propValue = props[k];
    if (propValue === undefined) {
      return;
    }
    if (k in nativeBaseDimensions) {
      let dim: (typeof nativeBaseDimensions)[keyof typeof nativeBaseDimensions] =
        nativeBaseDimensions[k as keyof typeof nativeBaseDimensions];
      styleProp[dim] = convertDimensionProp(propValue as NBDimensionValue);
    } else if (k in nativeBaseNumerics) {
      let dim:
        | (typeof nativeBaseNumerics)[keyof typeof nativeBaseNumerics]
        | 'rowGap' = nativeBaseNumerics[k as keyof typeof nativeBaseNumerics];
      if (k === 'space' && component === 'VStack') {
        dim = 'rowGap';
      }
      styleProp[dim] = convertDimensionProp(
        propValue as NBDimensionValue,
      ) as any;
    } else if (k in nativeBaseStyleProps) {
      (styleProp as any)[
        nativeBaseStyleProps[k as keyof typeof nativeBaseStyleProps]
      ] = propValue;
    } else if (k in nativeBaseColorProps) {
      (styleProp as any)[
        nativeBaseColorProps[k as keyof typeof nativeBaseColorProps]
      ] = convertColorProp(propValue as ThemeColor | ColorValue);
    } else if (k in nativeBaseSpecialProps) {
      Object.assign(
        styleProp,
        nativeBaseSpecialProps[k as keyof typeof nativeBaseSpecialProps](
          propValue as never,
        ),
      );
    } else if (k in nativeBaseTextProps) {
      Object.assign(
        styleProp,
        nativeBaseTextProps[k as keyof typeof nativeBaseTextProps](
          propValue as any,
        ),
      );
    } else {
      remainingProps[k] = props[k];
    }
  });
  remainingProps.style = remainingProps.style
    ? [remainingProps.style, styleProp]
    : styleProp;
  return remainingProps;
};
