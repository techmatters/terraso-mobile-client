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
import {Text, TouchableRipple} from 'react-native-paper';

import {Icon, IconName} from 'terraso-mobile-client/components/icons/Icon';
import {convertColorProp} from 'terraso-mobile-client/components/util/nativeBaseAdapters';

export type MenuItemVariant = 'default' | 'destructive';

export type MenuItemProps = {
  variant?: MenuItemVariant;
  uppercase?: boolean;
  label: string;
  subLabel?: string;
  icon?: IconName | React.ReactElement;
  pill?: React.ReactNode;
  disabled?: boolean;
  onPress?: PressableProps['onPress'];
};

export function MenuItem({
  variant = 'default',
  uppercase = false,
  icon,
  label,
  subLabel,
  pill,
  disabled,
  onPress,
  children,
}: React.PropsWithChildren<MenuItemProps>) {
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
    <TouchableRipple
      onPress={onPress!}
      disabled={disabled}
      accessibilityRole="menuitem"
      accessibilityState={{disabled: disabled}}
      accessibilityLabel={`${label} ${subLabel}`}>
      <View style={styles.root}>
        <View style={[styles.section, styles.iconSection]}>
          {typeof icon === 'string' ? (
            <Icon
              name={icon as IconName}
              size="sm"
              color={variantStyle.color}
            />
          ) : (
            icon
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
            {children && <View style={styles.childContainer}>{children}</View>}
          </View>
        </View>
        {pill && (
          <View style={[styles.section, styles.pillSection]}>{pill}</View>
        )}
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    margin: 16,
  },
  section: {
    alignSelf: 'center',
  },
  iconSection: {
    marginRight: 32,
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
  pillSection: {
    marginLeft: 'auto',
  },
});
