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

import {useMemo} from 'react';
import {PressableProps, StyleSheet, View} from 'react-native';
import {Pressable} from 'react-native-gesture-handler';
import {Divider, Text} from 'react-native-paper';

import {Icon, IconName} from 'terraso-mobile-client/components/icons/Icon';
import {convertColorProp} from 'terraso-mobile-client/components/util/nativeBaseAdapters';

export type MenuItemVariant = 'default' | 'destructive';

export type MenuItemProps = {
  variant?: MenuItemVariant;
  uppercase?: boolean;
  label: string;
  subLabel?: string;
  icon?: IconName | React.ReactElement;
  chip?: React.ReactNode;
  selected?: boolean;
  disabled?: boolean;
  onPress?: PressableProps['onPress'];
};

export const MenuItem = ({
  variant = 'default',
  uppercase = false,
  icon,
  label,
  subLabel,
  chip,
  selected,
  disabled,
  onPress,
  children,
}: React.PropsWithChildren<MenuItemProps>) => {
  const variantStyle = useMemo(() => {
    if (disabled) {
      return styles.disabled;
    } else if (variant === 'destructive') {
      return styles.destructive;
    } else {
      return styles.default;
    }
  }, [disabled, variant]);

  return (
    <>
      <Pressable
        /* The Ripple component doesn't allow null for onPress, so reduce it to either present or undefined */
        onPress={onPress ? () => onPress(undefined as any) : undefined}
        disabled={disabled}
        accessibilityRole="menuitem"
        accessibilityState={{selected: selected, disabled: disabled}}
        accessibilityLabel={`${label} ${subLabel}`}>
        <View
          style={[styles.container, selected ? styles.selected : styles.base]}>
          <View style={[styles.section, styles.iconSection]}>
            {typeof icon === 'string' ? (
              <Icon
                name={icon as IconName}
                size="md"
                color={variantStyle.color}
              />
            ) : (
              (icon ?? <View style={styles.emptyIcon} />)
            )}
          </View>
          <View style={[styles.section, styles.labelSection]}>
            <View style={[styles.labelsContainer]}>
              <Text
                selectable={false}
                style={[
                  styles.label,
                  uppercase && styles.uppercaseLabel,
                  variantStyle,
                ]}>
                {label}
              </Text>
              {subLabel && (
                <Text selectable={false} style={[styles.subLabel]}>
                  {subLabel}
                </Text>
              )}
              {children && (
                <View style={styles.childContainer}>{children}</View>
              )}
            </View>
          </View>
          {chip && (
            <View style={[styles.section, styles.chipSection]}>{chip}</View>
          )}
        </View>
      </Pressable>
      <Divider />
    </>
  );
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: convertColorProp('primary.contrast'),
  },
  selected: {
    backgroundColor: convertColorProp('input.filled.enabledFill'),
  },
  container: {
    flexDirection: 'row',
    margin: 16,
  },
  section: {
    alignSelf: 'center',
  },
  iconSection: {
    marginRight: 32,
  },
  emptyIcon: {
    width: 24 /* Same width as the default icon component in size: md */,
  },
  labelSection: {
    marginRight: 16,
    flex: 1,
  },
  labelsContainer: {
    flexDirection: 'column',
  },
  label: {
    fontSize: 16,
  },
  uppercaseLabel: {
    textTransform: 'uppercase',
  },
  subLabel: {
    fontSize: 16,
  },
  childContainer: {
    marginTop: 16,
    marginLeft:
      -16 /* Makes for neater layout in rare cases where children appear */,
  },
  default: {
    color: convertColorProp('text.primary'),
  },
  destructive: {
    color: convertColorProp('error.main'),
  },
  disabled: {
    color: convertColorProp('text.disabled'),
  },
  chipSection: {
    marginLeft: 'auto',
  },
});
