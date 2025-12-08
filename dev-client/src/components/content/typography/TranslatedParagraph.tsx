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

import React from 'react';

import {
  TranslatedContent,
  TranslatedContentProps,
} from 'terraso-mobile-client/components/content/typography/TranslatedContent';
import {Text} from 'terraso-mobile-client/components/NativeBaseAdapters';

type TranslatedParagraphProps = {
  variant?: 'body1' | 'body2';
} & TranslatedContentProps &
  Omit<React.ComponentProps<typeof Text>, 'variant' | 'children'>;

export function TranslatedParagraph({
  variant = 'body1',
  i18nKey,
  values,
  ...textProps
}: TranslatedParagraphProps) {
  return (
    <Text variant={variant} {...textProps}>
      <TranslatedContent i18nKey={i18nKey} values={values} />
    </Text>
  );
}
