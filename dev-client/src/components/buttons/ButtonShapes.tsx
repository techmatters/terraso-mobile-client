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

import {StyleSheet} from 'react-native';

import {IconSize} from 'terraso-mobile-client/components/util/nativeBaseAdapters';

/**
 * Standard shapes and sizes for button implementations. Individual button implementations
 * should use these constants for consistent styling.
 */
export type ButtonShape = 'sm' | 'md' | 'lg' | 'xl' | 'dialog' | 'text';

export const buttonShape = (shape: ButtonShape) => {
  return {
    containerStyles: containerStyles(shape),
    labelStyles: labelStyles(shape),
    leftIconStyles: leftIconStyles(shape),
    rightIconStyles: rightIconStyles(shape),
    iconSize: iconSize(shape),
  };
};

export const containerStyles = (shape: ButtonShape) => {
  return containerShapeStyles[shape];
};

export const labelStyles = (shape: ButtonShape) => {
  return labelShapeStyles[shape];
};

export const iconSize = (shape: ButtonShape) => {
  return iconShapeSize[shape];
};

export const leftIconStyles = (shape: ButtonShape) => {
  return leftIconShapeStyles[shape];
};

export const rightIconStyles = (shape: ButtonShape) => {
  return rightIconShapeStyles[shape];
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    borderRadius: 4,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerStretch: {
    alignSelf: 'auto',
  },
  containerSm: {
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  containerMd: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  containerLg: {
    paddingVertical: 8,
    paddingHorizontal: 22,
  },
  containerXl: {
    paddingVertical: 16,
    paddingHorizontal: 44,
  },
  containerDialog: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  containerText: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  label: {
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  labelSm: {
    fontSize: 13,
    lineHeight: 22,
  },
  labelMd: {
    fontSize: 14,
    lineHeight: 24,
  },
  labelLg: {
    fontSize: 15,
    lineHeight: 26,
  },
  labelXl: {
    fontSize: 15,
    lineHeight: 26,
  },
  labelDialog: {
    fontSize: 14,
    lineHeight: 20,
    textTransform: 'capitalize',
  },
  labelText: {
    fontSize: 14,
    lineHeight: 24,
    marginHorizontal: 8,
  },
  leftIcon: {
    marginRight: 8,
  },
  rightIcon: {
    marginLeft: 8,
  },
});

const containerShapeStyles = {
  sm: [styles.container, styles.containerSm],
  md: [styles.container, styles.containerMd],
  lg: [styles.container, styles.containerLg],
  xl: [styles.container, styles.containerXl],
  dialog: [styles.container, styles.containerDialog],
  text: [styles.container, styles.containerText],
};

const labelShapeStyles = {
  sm: [styles.label, styles.labelSm],
  md: [styles.label, styles.labelMd],
  lg: [styles.label, styles.labelLg],
  xl: [styles.label, styles.labelXl],
  dialog: [styles.label, styles.labelDialog],
  text: [styles.label, styles.labelText],
};

const leftIconShapeStyles = {
  sm: [styles.leftIcon],
  md: [styles.leftIcon],
  lg: [styles.leftIcon],
  xl: [styles.leftIcon],
  dialog: [styles.leftIcon],
  text: [styles.leftIcon],
};

const rightIconShapeStyles = {
  sm: [styles.rightIcon],
  md: [styles.rightIcon],
  lg: [styles.rightIcon],
  xl: [styles.rightIcon],
  dialog: [styles.rightIcon],
  text: [styles.rightIcon],
};

const iconShapeSize: Record<ButtonShape, IconSize> = {
  sm: 'xs',
  md: 'sm',
  lg: 'md',
  xl: 'md',
  dialog: 'md',
  text: 'sm',
};
