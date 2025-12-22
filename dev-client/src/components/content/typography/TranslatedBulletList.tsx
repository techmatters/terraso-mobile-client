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

import i18n from 'i18next';

import {BulletList} from 'terraso-mobile-client/components/BulletList';
import {TranslatedParagraph} from 'terraso-mobile-client/components/content/typography/TranslatedParagraph';

type TranslatedBulletListProps = {
  variant?: 'body1' | 'body2';
  i18nKeys?: string[];
  i18nKeyPrefix?: string;
  values?: {};
};

export function TranslatedBulletList({
  variant = 'body1',
  i18nKeys,
  i18nKeyPrefix,
  values,
}: TranslatedBulletListProps) {
  const keys = useMemo(() => {
    if (i18nKeys) {
      return i18nKeys;
    }
    if (i18nKeyPrefix) {
      const result: string[] = [];
      let index = 1;
      while (i18n.exists(`${i18nKeyPrefix}${index}`)) {
        result.push(`${i18nKeyPrefix}${index}`);
        index++;
      }
      return result;
    }
    return [];
  }, [i18nKeys, i18nKeyPrefix]);

  return (
    <BulletList
      data={keys}
      renderItem={i18nKey => (
        <TranslatedParagraph
          i18nKey={i18nKey}
          values={values}
          variant={variant}
        />
      )}
    />
  );
}
