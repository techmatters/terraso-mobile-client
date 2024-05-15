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

import {Link} from 'native-base';
import {InterfaceLinkProps} from 'native-base/lib/typescript/components/primitives/Link/types';
import {useCallback} from 'react';
import {Linking} from 'react-native';

type InternalLinkProps = {
  label: string;
  onPress?: InterfaceLinkProps['onPress'];
  url?: string;
};

export default function InternalLink({label, onPress, url}: InternalLinkProps) {
  const openUrl = useCallback(() => {
    if (url !== undefined) {
      Linking.openURL(url);
    }
  }, [url]);

  return (
    <Link
      _text={{color: 'primary.main'}}
      isUnderlined={true}
      onPress={onPress ? onPress : openUrl}>
      {label}
    </Link>
  );
}
