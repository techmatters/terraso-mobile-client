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

import * as WebBrowser from 'expo-web-browser';

import {Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {validateUrl} from 'terraso-mobile-client/util';

type InternalLinkProps = {
  label: string;
  onPress?: PressableProps['onPress'];
  url: string;
};

export default function InternalLink({label, onPress, url}: InternalLinkProps) {
  const isValidUrl = useMemo(() => validateUrl(url), [url]);
  const openUrl = useCallback(() => WebBrowser.openBrowserAsync(url), [url]);
  const [pressed, setPressed] = useState(false);

  return (
    isValidUrl && (
      <Text
        role="link"
        color={!pressed ? 'primary.main' : 'primary.dark'}
        underline={true}
        fontWeight={700}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        onPress={onPress ? onPress : openUrl}>
        {label}
      </Text>
    )
  );
}
