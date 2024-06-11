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
import {memo} from 'react';
import {useTranslation} from 'react-i18next';
import {Searchbar} from 'react-native-paper';

import {searchBarStyles} from 'terraso-mobile-client/components/ListFilter';
import {
  Heading,
  HStack,
  Text,
  VStack,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {HelpTooltipButton} from 'terraso-mobile-client/components/tooltips/HelpTooltipButton';

type Props = {query: string; setQuery: (query: string) => void};

export const ListHeader = memo(({query, setQuery}: Props) => {
  const {t} = useTranslation();
  return (
    <VStack space="10px" px="12px" pt="10px" pb="10px">
      <HStack>
        <Heading>{t('projects.transfer_sites.heading')}</Heading>
        <HelpTooltipButton>
          {t('projects.transfer_sites.tooltip')}
        </HelpTooltipButton>
      </HStack>
      <Text>{t('projects.transfer_sites.description')}</Text>
      <Searchbar
        value={query !== undefined ? query : ''}
        onChangeText={setQuery}
        placeholder={t('site.search.placeholder')}
        style={searchBarStyles.search}
        inputStyle={searchBarStyles.input}
      />
    </VStack>
  );
});
