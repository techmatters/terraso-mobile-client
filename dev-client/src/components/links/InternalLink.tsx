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
import {PressableProps} from 'react-native';

import {openBrowserAsync} from 'expo-web-browser';

import {Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {validateUrl} from 'terraso-mobile-client/util';

type InternalLinkProps = {
  label: string;
  url?: string;
  onPress?: PressableProps['onPress'];
};

export const InternalLink = ({label, url, onPress}: InternalLinkProps) => {
  const [pressed, setPressed] = useState(false);
  const onPressIn = useCallback(() => setPressed(true), [setPressed]);
  const onPressOut = useCallback(() => setPressed(false), [setPressed]);

  const isValidUrl = useMemo(() => validateUrl(url), [url]);
  const openUrl = useCallback(() => {
    if (isValidUrl) {
      openBrowserAsync(url!);
    }
  }, [url, isValidUrl]);
  const shouldDisplay = isValidUrl || Boolean(onPress);

  return shouldDisplay ? (
    <Text
      accessibilityRole="link"
      color={pressed ? 'primary.dark' : 'primary.main'}
      underline={true}
      fontWeight={700}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      onPress={onPress ? onPress : openUrl}>
      {label}
    </Text>
  ) : (
    <></>
  );
};
