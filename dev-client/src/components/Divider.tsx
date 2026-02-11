/*
 * Copyright © 2026 Technology Matters
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
import {DividerProps, Divider as PaperDivider} from 'react-native-paper';

/**
 * Wrapper around react-native-paper's Divider that ensures visibility
 * and consistent thickness on high-DPI displays (like iPads) where
 * hairline-width dividers can become invisible or render inconsistently.
 */
export const Divider = ({style, ...props}: DividerProps) => {
  return <PaperDivider style={[styles.divider, style]} {...props} />;
};

const styles = StyleSheet.create({
  divider: {
    height: 2,
    backgroundColor: '#E0E0E0', // grey.300 - light gray, thicker line needs lighter color
  },
});
