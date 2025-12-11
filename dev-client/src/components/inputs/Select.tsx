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
import {Pressable, StyleSheet, ViewStyle} from 'react-native';

import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {MenuItem} from 'terraso-mobile-client/components/menus/MenuItem';
import {MenuList} from 'terraso-mobile-client/components/menus/MenuList';
import {ModalHandle} from 'terraso-mobile-client/components/modals/Modal';
import {
  Column,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {FormOverlaySheet} from 'terraso-mobile-client/components/sheets/FormOverlaySheet';
import {theme} from 'terraso-mobile-client/theme';

// utility type so we can strictly validate the types of inputs/callbacks
// based on whether the select is nullable
type NullableIf<T, Nullable extends boolean> = Nullable extends true
  ? T | null
  : T;

type SharedSelectProps<T, Nullable extends boolean> = {
  nullable: Nullable;
  options: T[] | readonly T[];
  optionKey?: (_: T) => string;
  value: NullableIf<T, Nullable>;
  onValueChange: (value: NullableIf<T, Nullable>) => void;
  unselectedLabel?: string;
  renderValue: (_: T) => string;
};

export type SelectMenuListProps<
  T,
  Nullable extends boolean,
> = SharedSelectProps<T, Nullable> & {
  modalRef: React.RefObject<ModalHandle | null>;
};

export type SelectProps<T, Nullable extends boolean> = SharedSelectProps<
  T,
  Nullable
> & {
  label?: string;
  disabled?: boolean;
} & ViewStyle;

export const SelectMenuList = <T, Nullable extends boolean>({
  nullable,
  options,
  optionKey,
  value,
  onValueChange,
  unselectedLabel,
  renderValue,
  modalRef,
}: SelectMenuListProps<T, Nullable>) => {
  const closeContainingModal = useCallback(
    () => modalRef.current?.onClose(),
    [modalRef],
  );

  const optionsWithNull = useMemo(
    () => (nullable ? [null, ...options] : options),
    [nullable, options],
  );

  return (
    <MenuList>
      {optionsWithNull.map(option => {
        const itemLabel = option ? renderValue(option) : unselectedLabel!;
        const selected = option === value;
        let key;
        if (optionKey) {
          key = option === null ? null : optionKey(option);
        } else {
          key = itemLabel === undefined ? '' : itemLabel;
        }
        return (
          <MenuItem
            key={key}
            label={itemLabel}
            icon={selected ? 'check' : undefined}
            selected={selected}
            onPress={() => {
              onValueChange(option as T);
              closeContainingModal();
            }}
          />
        );
      })}
    </MenuList>
  );
};

export const Select = <T, Nullable extends boolean>({
  nullable,
  options,
  optionKey,
  value,
  onValueChange,
  label,
  unselectedLabel,
  renderValue,
  disabled = false,
  ...style
}: SelectProps<T, Nullable>) => {
  const ref = useRef<ModalHandle>(null);

  return (
    <FormOverlaySheet
      ref={ref}
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
              <Text
                variant="input-text"
                color={disabled ? 'text.disabled' : 'text.primary'}>
                {value === null ? label : renderValue(value)}
              </Text>
            </Column>
            <Icon
              color={disabled ? 'action.disabled' : 'action.active'}
              name="arrow-drop-down"
            />
          </Row>
        </Pressable>
      )}>
      <SelectMenuList
        nullable={nullable}
        options={options}
        optionKey={optionKey}
        value={value}
        onValueChange={onValueChange}
        unselectedLabel={unselectedLabel}
        renderValue={renderValue}
        modalRef={ref}
      />
    </FormOverlaySheet>
  );
};
