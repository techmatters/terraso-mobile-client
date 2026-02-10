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

import {useCallback} from 'react';
import {Linking} from 'react-native';

import {Text} from 'terraso-mobile-client/components/NativeBaseAdapters';

type TextLinkProps = Omit<React.ComponentProps<typeof Text>, 'onPress'> & {
  url: string;
};

/**
 * Inline link component for use within text blocks.
 * Opens URLs using system handler (supports mailto:, https:, etc.)
 *
 * Typically used indirectly via TextWithLinks for translated strings:
 *   <TextWithLinks>{t('key')}</TextWithLinks>
 *   // where translation contains: "Contact <link url="mailto:help@terraso.org">help@terraso.org</link>"
 *
 * Direct usage:
 *   <Text>Contact <TextLink url="mailto:help@terraso.org">help@terraso.org</TextLink> for help.</Text>
 */
export const TextLink = ({url, children, ...textProps}: TextLinkProps) => {
  const onPress = useCallback(() => {
    Linking.openURL(url).catch(() => {
      // Silently ignore - URL scheme may not be supported (e.g., mailto: on simulator)
    });
  }, [url]);

  return (
    <Text accessibilityRole="link" underline onPress={onPress} {...textProps}>
      {children}
    </Text>
  );
};
