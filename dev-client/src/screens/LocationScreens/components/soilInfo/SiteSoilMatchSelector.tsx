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

import {Checkbox} from 'react-native-paper';

import {DataBasedSoilMatch} from 'terraso-client-shared/graphqlSchema/graphql';

import {TranslatedParagraph} from 'terraso-mobile-client/components/content/typography/TranslatedParagraph';
import {Row} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useSiteSoilMatchSelection} from 'terraso-mobile-client/hooks/useSiteSoilMatchSelection';

type SiteSoilMatchSelectorProps = {
  siteId: string;
  match: DataBasedSoilMatch;
};

export function SiteSoilMatchSelector({
  siteId,
  match,
}: SiteSoilMatchSelectorProps) {
  const {selection, setSelection} = useSiteSoilMatchSelection(siteId);
  const matchName = match.soilInfo.soilSeries.name;
  const isSelected = selection === matchName;

  return (
    <Row alignItems="center">
      <Checkbox
        status={isSelected ? 'checked' : 'unchecked'}
        onPress={() => setSelection(isSelected ? null : matchName)}
      />
      <TranslatedParagraph i18nKey="site.soil_id.rating.match_selector" />
    </Row>
  );
}
