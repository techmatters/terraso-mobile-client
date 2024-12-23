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

import {useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet, Text} from 'react-native';
import {TouchableRipple, TouchableRippleProps} from 'react-native-paper';

import {convertColorProp} from 'terraso-mobile-client/components/util/nativeBaseAdapters';

export type CreateSiteButtonProps = {
  disabled?: boolean;
  onPress?: TouchableRippleProps['onPress'];
};

export const CreateSiteButton = ({
  disabled,
  onPress,
}: CreateSiteButtonProps) => {
  const {t} = useTranslation();

  const [pressed, setPressed] = useState(false);
  const onPressIn = useMemo(() => () => setPressed(true), [setPressed]);
  const onPressOut = useMemo(() => () => setPressed(false), [setPressed]);

  const label = t('site.create.title');
  const colorStyles = disabled ? COLOR_STYLES.disabled : COLOR_STYLES.default;
  const colorStyle = pressed ? colorStyles.pressed : colorStyles.default;

  return (
    <TouchableRipple
      style={[styles.container, colorStyle.container]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{disabled}}
      disabled={disabled}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}>
      <Text style={[styles.label, colorStyle.content]}>{label}</Text>
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 4,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  containerDefault: {
    borderColor: convertColorProp('primary.main'),
    backgroundColor: convertColorProp('transparent'),
  },
  containerDefaultPressed: {
    borderColor: convertColorProp('primary.dark'),
    backgroundColor: convertColorProp('action.selected'),
  },
  containerDisabled: {
    borderColor: convertColorProp('action.disabled'),
    backgroundColor: convertColorProp('transparent'),
  },
  contentDefault: {
    color: convertColorProp('primary.main'),
  },
  contentDefaultPressed: {
    color: convertColorProp('primary.dark'),
  },
  contentDisabled: {
    color: convertColorProp('action.disabled'),
  },
  label: {
    fontWeight: '500',
    textTransform: 'uppercase',
    fontSize: 13,
    lineHeight: 22,
  },
});

const COLOR_STYLES = {
  default: {
    default: {
      container: styles.containerDefault,
      content: styles.contentDefault,
    },
    pressed: {
      container: styles.containerDefaultPressed,
      content: styles.contentDefaultPressed,
    },
  },
  disabled: {
    default: {
      container: styles.containerDisabled,
      content: styles.contentDisabled,
    },
    pressed: {
      container: styles.containerDisabled,
      content: styles.contentDisabled,
    },
  },
};
