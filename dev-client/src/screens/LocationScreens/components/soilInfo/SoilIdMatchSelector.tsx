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

import {StyleSheet, View} from 'react-native';

import CheckBox from '@react-native-community/checkbox';

import {DataBasedSoilMatch} from 'terraso-client-shared/graphqlSchema/graphql';

import {TranslatedParagraph} from 'terraso-mobile-client/components/content/typography/TranslatedParagraph';
import {RestrictBySiteRole} from 'terraso-mobile-client/components/RestrictByRole';
import {SITE_EDITOR_ROLES} from 'terraso-mobile-client/model/permissions/permissions';
import {getMatchSelectionId} from 'terraso-mobile-client/model/soilId/soilMetadataFunctions';
import {useSoilIdSelection} from 'terraso-mobile-client/model/soilId/soilMetadataHooks';

type SoilIdMatchSelectorProps = {
  match: DataBasedSoilMatch;
  siteId: string;
};

export function SoilIdMatchSelector({siteId, match}: SoilIdMatchSelectorProps) {
  const {selectedSoilId, selectSoilId} = useSoilIdSelection(siteId);
  const matchId = getMatchSelectionId(match);

  return (
    <RestrictBySiteRole role={SITE_EDITOR_ROLES}>
      <View style={styles.container}>
        <CheckBox
          value={selectedSoilId === matchId}
          onValueChange={value => {
            selectSoilId(value ? matchId : null);
          }}
        />
        <TranslatedParagraph i18nKey="site.soil_id.matches.selector" />
      </View>
    </RestrictBySiteRole>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
