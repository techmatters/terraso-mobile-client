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

import {useCallback, useMemo, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {Pressable, StyleSheet, ViewStyle} from 'react-native';

import {BottomSheetFlatList} from '@gorhom/bottom-sheet';

import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {ModalHandle} from 'terraso-mobile-client/components/modals/Modal';
import {
  Box,
  Column,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {OverlaySheet} from 'terraso-mobile-client/components/sheets/OverlaySheet';
import {theme} from 'terraso-mobile-client/theme';
import {StyleSheet} from 'react-native';

// utility type so we can strictly validate the types of inputs/callbacks
// based on whether the select is nullable
type NullableIf<T, Nullable extends boolean> = Nullable extends true
  ? T | null
  : T;

export type SelectProps<T, Nullable extends boolean> = {
  nullable: Nullable;
  options: T[] | readonly T[];
  renderValue: (_: T) => string;
  value: NullableIf<T, Nullable>;
  onValueChange: (value: NullableIf<T, Nullable>) => void;
  label?: string;
  unselectedLabel?: string;
  disabled?: boolean;
} & ViewStyle;

export const Select = <T, Nullable extends boolean>({
  nullable,
  options,
  onValueChange,
  renderValue,
  value,
  label,
  unselectedLabel,
  disabled = false,
  ...style
}: SelectProps<T, Nullable>) => {
  const {t} = useTranslation();
  const ref = useRef<ModalHandle>(null);
  const onClose = useCallback(() => ref.current?.onClose(), [ref]);

  const renderOption = useCallback(
    ({item: option}: {item: T | null}) => (
      <Pressable
        accessibilityState={{
          selected: value === option,
        }}
        onPress={() => {
          onValueChange(option as T);
          onClose();
        }}>
        <Row
          backgroundColor={
            option === value ? 'input.filled.enabledFill' : 'primary.contrast'
          }
          justifyContent="flex-start"
          alignItems="center"
          paddingVertical="sm"
          paddingHorizontal="sm">
          <Icon
            color={option === value ? 'action.active' : 'primary.contrast'}
            name="check"
            size="sm"
          />
          <Box width="sm" />
          <Text variant="body1" color="text.primary">
            {option ? renderValue(option) : unselectedLabel}
          </Text>
        </Row>
      </Pressable>
    ),
    [value, renderValue, onValueChange, unselectedLabel, onClose],
  );

  const Header = useMemo(
    () => (
      <Pressable onPress={onClose}>
        <Row
          backgroundColor="primary.main"
          justifyContent="flex-end"
          alignItems="center"
          padding="md">
          <Text
            variant="body1-strong"
            color="primary.contrast"
            textTransform="uppercase">
            {t('general.done')}
          </Text>
        </Row>
      </Pressable>
    ),
    [t, onClose],
  );

  const optionsWithNull = useMemo(
    () => (nullable ? [null, ...options] : options),
    [nullable, options],
  );

  return (
    <OverlaySheet
      ref={ref}
      scrollable={false}
      Closer={null}
      trigger={onOpen => (
        <Pressable
          accessibilityState={{disabled}}
          onPress={disabled ? null : onOpen}>
          <Row
            justifyContent="space-between"
            alignItems="center"
            backgroundColor={theme.colors.input.filled.enabledFill}
            borderBottomColor={theme.colors.input.standard.enabledBorder}
            style={{...style, borderBottomWidth: StyleSheet.hairlineWidth}}
            padding="10px">
            <Column justifyContent="center">
              {value !== null && label ? (
                <Text variant="caption">{label}</Text>
              ) : (
                <></>
              )}
              <Text variant="input-text">
                {value === null ? label : renderValue(value)}
              </Text>
            </Column>
            <Icon color="action.active" name="arrow-drop-down" />
          </Row>
        </Pressable>
      )}>
      <BottomSheetFlatList
        ListHeaderComponent={Header}
        data={optionsWithNull}
        renderItem={renderOption}
      />
    </OverlaySheet>
  );
};
