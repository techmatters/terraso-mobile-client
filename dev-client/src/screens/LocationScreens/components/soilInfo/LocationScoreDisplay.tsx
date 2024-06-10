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
import {useTranslation} from 'react-i18next';

import {
  DataBasedSoilMatch,
  LocationBasedSoilMatch,
  SoilMatchInfo,
} from 'terraso-client-shared/graphqlSchema/graphql';
import {Coords} from 'terraso-client-shared/types';

import {TranslatedParagraph} from 'terraso-mobile-client/components/content/typography/TranslatedParagraph';
import {ExternalLink} from 'terraso-mobile-client/components/links/ExternalLink';
import {
  Column,
  Heading,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {InfoOverlaySheetButton} from 'terraso-mobile-client/components/sheets/InfoOverlaySheetButton';
import {LocationScoreInfoContent} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/LocationScoreInfoContent';
import {ScoreTile} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/ScoreTile';
import {getSoilWebUrl} from 'terraso-mobile-client/util';

type LocationScoreDisplayProps = {
  isSite: boolean;
  match: LocationBasedSoilMatch | DataBasedSoilMatch;
  matchInfo: SoilMatchInfo;
  coords: Coords;
};

export function LocationScoreDisplay({
  isSite,
  match,
  matchInfo,
  coords,
}: LocationScoreDisplayProps) {
  const {t} = useTranslation();
  const isInMap = match.distanceToNearestMapUnitM <= 0;
  const soilWebUrl = useMemo(() => getSoilWebUrl(coords), [coords]);
  return (
    <Column space="16px">
      <Row justifyContent="space-between" alignItems="center">
        <Column space="12px" maxWidth="75%">
          <Row alignItems="stretch">
            <Heading variant="h6">
              {t('site.soil_id.location_score_info.header')}
            </Heading>
            <InfoOverlaySheetButton
              Header={t('site.soil_id.location_score_info.header')}>
              <LocationScoreInfoContent isSite={isSite} />
            </InfoOverlaySheetButton>
          </Row>
          <TranslatedParagraph
            i18nKey={
              isInMap
                ? 'site.soil_id.soil_info.inside_map_label'
                : 'site.soil_id.soil_info.outside_map_label'
            }
            values={{
              distance: match.distanceToNearestMapUnitM,
              units: t('site.soil_id.soil_info.map_units_METRIC'),
            }}
          />
        </Column>
        <ScoreTile score={matchInfo.score} />
      </Row>
      <ExternalLink
        label={t('site.soil_id.soil_info.location_url')}
        url={soilWebUrl}
      />
    </Column>
  );
}
