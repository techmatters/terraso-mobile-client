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
  StyleSheet,
  Text as RNText,
  TextProps as RNTextProps,
} from 'react-native';
import {theme} from 'terraso-mobile-client/theme';
import {
  ThemedTextStyle,
  convertThemedStyle,
} from 'terraso-mobile-client/components/core/styleConversions';

export type TextProps = ThemedTextStyle &
  RNTextProps & {
    variant: keyof typeof variants;
  };

export const Text = ({
  variant,
  ...remainingProps
}: React.PropsWithChildren<TextProps>) => {
  const {style, props} = convertThemedStyle(remainingProps);
  return (
    <RNText style={[styles.default, variants[variant], style]} {...props} />
  );
};

const styles = StyleSheet.create({
  default: {color: theme.colors.text.primary},
});

const variants = StyleSheet.create({
  body1: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    letterSpacing: 0.15,
  },
  'body1-strong': {
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 24,
  },
  body2: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    letterSpacing: 0.17,
  },
  subtitle1: {},
  subtitle2: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 20,
    letterSpacing: 0.4,
  },
  h3: {
    fontSize: 48,
    fontWeight: '400',
    lineHeight: 56,
  },
  h4: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 32,
  },
  h5: {
    fontSize: 24,
    fontWeight: '400',
    lineHeight: 32,
  },
  h6: {
    fontSize: 20,
    fontWeight: '500',
    lineHeight: 32,
  },
});
