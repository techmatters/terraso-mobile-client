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

import {Button} from 'native-base';

import {
  DataBasedSoilMatch,
  LocationBasedSoilMatch,
} from 'terraso-client-shared/graphqlSchema/graphql';
import {Coords} from 'terraso-client-shared/types';

import StackedBarChart from 'terraso-mobile-client/assets/stacked-bar.svg';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {
  Box,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {SoilIdStatusDisplay} from 'terraso-mobile-client/components/SoilIdStatusDisplay';
import {SoilIdStatus} from 'terraso-mobile-client/model/soilId/soilIdSlice';
import {findSelectedMatch} from 'terraso-mobile-client/model/soilId/soilMetadataFunctions';
import {useSoilIdSelection} from 'terraso-mobile-client/model/soilId/soilMetadataHooks';
import {useSoilIdData} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatchHooks';
import {getTopMatch} from 'terraso-mobile-client/model/soilIdMatch/soilIdRanking';

type LocationSoilIdCardProps = {
  coords: Coords;
  siteId?: string;
  onExploreDataPress: () => void;
};

export const LocationSoilIdCard = ({
  coords,
  siteId,
  onExploreDataPress,
}: LocationSoilIdCardProps) => {
  const {t} = useTranslation();

  const isSite = !!siteId;

  return (
    <Box variant="tile" flexDirection="column" alignItems="flex-start" p="18px">
      <Row alignItems="center">
        <Box mr={15}>
          <StackedBarChart />
        </Box>
        <Text
          variant="body1"
          color="primary.lighter"
          textTransform="uppercase"
          bold>
          {t('soil.soil_id')}
        </Text>
      </Row>
      <Box h="15px" />
      {isSite ? (
        <SiteMatchContent siteId={siteId} coords={coords} />
      ) : (
        <TempLocationMatchContent coords={coords} />
      )}

      <Button
        w="100%"
        _text={{textTransform: 'uppercase'}}
        rightIcon={<Icon name="chevron-right" />}
        onPress={onExploreDataPress}>
        {t('soil.explore_data')}
      </Button>
    </Box>
  );
};

type LocationMatchDisplayProps = {coords: Coords};

const TempLocationMatchContent = ({coords}: LocationMatchDisplayProps) => {
  const soilIdData = useSoilIdData(coords);
  const topSoilMatch = useMemo(() => getTopMatch(soilIdData), [soilIdData]);

  return <MatchContent status={soilIdData.status} match={topSoilMatch} />;
};

type SiteMatchDisplayProps = {coords: Coords; siteId: string};

const SiteMatchContent = ({coords, siteId}: SiteMatchDisplayProps) => {
  const soilIdData = useSoilIdData(coords, siteId);
  const topSoilMatch = useMemo(() => getTopMatch(soilIdData), [soilIdData]);
  const {selectedSoilId} = useSoilIdSelection(siteId);
  const selectedSoilMatch = findSelectedMatch(
    soilIdData.dataBasedMatches,
    selectedSoilId,
  );

  return (
    <MatchContent
      status={soilIdData.status}
      match={selectedSoilMatch || topSoilMatch}
      isSelected={!!selectedSoilMatch}
    />
  );
};

type MatchContentProps = {
  status: SoilIdStatus;
  match: LocationBasedSoilMatch | DataBasedSoilMatch | undefined;
  isSelected?: boolean;
};

const MatchContent = ({
  status,
  match,
  isSelected = false,
}: MatchContentProps) => {
  const {t} = useTranslation();

  return (
    <>
      <Text variant="body1" color="primary.contrast" mb="5px">
        <Text bold>
          {t(isSelected ? 'site.soil_id.matches.selected' : 'soil.top_match')}:{' '}
        </Text>
        <SoilIdStatusDisplay
          status={status}
          loading={<Text>{t('soil.loading')}</Text>}
          error={<Text>{t('soil.error')}</Text>}
          noData={<Text>{t('soil.no_matches')}</Text>}
          data={
            <Text>
              {match?.soilInfo.soilSeries.name ?? t('soil.no_matches')}
            </Text>
          }
        />
      </Text>
      <Text variant="body1" color="primary.contrast" mb="25px">
        <Text bold>{t('soil.ecological_site_name')}: </Text>
        <SoilIdStatusDisplay
          status={status}
          loading={<Text>{t('soil.loading')}</Text>}
          error={<Text>{t('soil.error')}</Text>}
          noData={<Text>{t('soil.no_matches')}</Text>}
          data={
            <Text>
              {match?.soilInfo.ecologicalSite?.name ?? t('soil.no_matches')}
            </Text>
          }
        />
      </Text>
    </>
  );
};
