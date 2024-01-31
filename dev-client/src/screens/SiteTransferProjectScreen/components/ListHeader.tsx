/*
 * Copyright © 2023 Technology Matters
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

import {Heading, Text} from 'native-base';
import {SearchBar} from 'terraso-mobile-client/components/SearchBar';
import {useTranslation} from 'react-i18next';
import {memo} from 'react';
import {FormTooltip} from 'terraso-mobile-client/components/form/FormTooltip';
import {
  HStack,
  VStack,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

type Props = {query: string; setQuery: (query: string) => void};

export const ListHeader = memo(({query, setQuery}: Props) => {
  const {t} = useTranslation();
  return (
    <VStack space="10px" px="12px" pt="5%">
      <HStack>
        <Heading>{t('projects.transfer_sites.heading', '')}</Heading>
        <FormTooltip icon="help">
          {t('projects.transfer_sites.tooltip')}
        </FormTooltip>
      </HStack>
      <Text>{t('projects.transfer_sites.description', '')}</Text>
      <SearchBar
        query={query}
        setQuery={setQuery}
        placeholder={t('site.search.placeholder')}
      />
    </VStack>
  );
});
