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

import {useCallback, useMemo, useState} from 'react';
import {Linking, Pressable, StyleSheet, Text} from 'react-native';

import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {convertColorProp} from 'terraso-mobile-client/components/util/nativeBaseAdapters';
import {validateUrl} from 'terraso-mobile-client/util';

export type ExternalLinkType = 'default' | 'alertError';

export type ExternalLinkProps = {
  type?: ExternalLinkType;
  label: string;
  url: string;
};

export const ExternalLink = ({
  type = 'default',
  label,
  url,
}: ExternalLinkProps) => {
  const [pressed, setPressed] = useState(false);
  const onPressIn = useCallback(() => setPressed(true), [setPressed]);
  const onPressOut = useCallback(() => setPressed(false), [setPressed]);

  const isValidUrl = useMemo(() => validateUrl(url), [url]);
  const openUrl = useCallback(() => Linking.openURL(url), [url]);

  const colorStyles = COLOR_STYLES[type];
  const colorStyle = pressed ? colorStyles.pressed : colorStyles.default;

  return isValidUrl ? (
    <Pressable
      style={styles.container}
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={openUrl}
      onPressIn={onPressIn}
      onPressOut={onPressOut}>
      <Text style={[styles.label, colorStyle]}>{label}</Text>
      <Icon name="open-in-new" style={[styles.icon, colorStyle]} />
    </Pressable>
  ) : (
    <></>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  label: {
    textTransform: 'uppercase',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 26,
  },
  icon: {
    marginRight: 8,
  },
  contentDefault: {
    color: convertColorProp('primary.main'),
  },
  contentDefaultPressed: {
    color: convertColorProp('primary.dark'),
  },
  contentAlertError: {
    color: convertColorProp('error.content'),
  },
  contentAlertErrorPressed: {
    color: convertColorProp('error.content'),
  },
});

const COLOR_STYLES = {
  default: {
    default: styles.contentDefault,
    pressed: styles.contentDefaultPressed,
  },
  alertError: {
    default: styles.contentAlertError,
    pressed: styles.contentAlertError,
  },
};
