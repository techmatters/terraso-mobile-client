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

import {useTranslation} from 'react-i18next';

import {TranslatedParagraph} from 'terraso-mobile-client/components/content/typography/TranslatedParagraph';
import {Column} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {
  DataRegion,
  getSoilMapSource,
} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';

type LocationScoreInfoContentProps = {
  isSite: boolean;
  dataRegion: DataRegion;
};

export function LocationScoreInfoContent({
  isSite,
  dataRegion,
}: LocationScoreInfoContentProps) {
  const {t} = useTranslation();
  const soilMapSource = t(getSoilMapSource(dataRegion));

  return (
    <Column space={3}>
      {isSite && (
        <TranslatedParagraph i18nKey="site.soil_id.location_score_info.p1" />
      )}
      {dataRegion ? (
        <TranslatedParagraph
          i18nKey="site.soil_id.location_score_info.p2"
          values={{soilMapSource}}
        />
      ) : (
        <TranslatedParagraph i18nKey="site.soil_id.location_score_info.p2_region_unknown" />
      )}
      <TranslatedParagraph i18nKey="site.soil_id.location_score_info.p3" />
    </Column>
  );
}
