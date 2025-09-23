/*
 * Copyright © 2025 Technology Matters
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

import React from 'react';
import {StyleSheet} from 'react-native';

import Checkbox from 'expo-checkbox';

type CircularCheckboxProps = React.ComponentProps<typeof Checkbox>;

export const CircularCheckbox = (props: CircularCheckboxProps) => {
  const {value, style, color, ...rest} = props;

  return (
    <Checkbox
      style={[styles.checkbox, style]}
      value={value}
      color={value && !color ? '#007aff' : color} // expo example uses #4630EB
      {...rest}
    />
  );
};

const styles = StyleSheet.create({
  checkbox: {
    width: 24,
    height: 24,
    // borderRadius: 12, // Makes it circular (half of width/height)
    marginRight: 8,
    alignSelf: 'center', // Centers checkbox vertically with its label
  },
});
