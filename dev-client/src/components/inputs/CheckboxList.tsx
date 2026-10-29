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

import {useCallback, useMemo} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';

import {StandardCheckbox} from 'terraso-mobile-client/components/inputs/StandardCheckbox';
import {Text} from 'terraso-mobile-client/components/NativeBaseAdapters';

/* Shared by any multi-select control, so a different presentation (e.g. a dropdown) can replace CheckboxList without changing callers. */
export type MultiSelectProps<T> = {
  label: string;
  options: readonly T[];
  optionKey: (option: T) => string;
  renderValue: (option: T) => string;
  value: readonly T[];
  onValueChange: (value: T[]) => void;
};

export const CheckboxList = <T,>({
  label,
  options,
  optionKey,
  renderValue,
  value,
  onValueChange,
}: MultiSelectProps<T>) => {
  const selectedKeys = useMemo(
    () => new Set(value.map(optionKey)),
    [value, optionKey],
  );

  /* Rebuilt from `options` so the selection always stays in display order, regardless of the order boxes were checked. */
  const toggle = useCallback(
    (toggledKey: string) =>
      onValueChange(
        options.filter(option => {
          const key = optionKey(option);
          const isSelected = selectedKeys.has(key);
          return key === toggledKey ? !isSelected : isSelected;
        }),
      ),
    [options, optionKey, selectedKeys, onValueChange],
  );

  return (
    <View style={styles.container}>
      <Text variant="body1-strong">{label}</Text>
      {options.map(option => {
        const key = optionKey(option);
        const optionLabel = renderValue(option);
        const checked = selectedKeys.has(key);
        return (
          <Pressable
            key={key}
            onPress={() => toggle(key)}
            accessibilityRole="checkbox"
            accessibilityState={{checked}}
            accessibilityLabel={optionLabel}
            style={styles.row}>
            {/* The whole row is the press target and the accessible element, so the box itself is display-only. */}
            <View style={styles.displayOnly}>
              <StandardCheckbox
                value={checked}
                accessible={false}
                importantForAccessibility="no-hide-descendants"
              />
            </View>
            <Text variant="body1">{optionLabel}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  displayOnly: {
    pointerEvents: 'none',
  },
});
