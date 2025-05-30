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

import {Coords} from 'terraso-client-shared/types';

import StackedBarChart from 'terraso-mobile-client/assets/stacked-bar.svg';
import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {
  Box,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {SoilIdStatusDisplay} from 'terraso-mobile-client/components/SoilIdStatusDisplay';
import {useSoilIdOutput} from 'terraso-mobile-client/hooks/soilIdHooks';
import {SoilIdStatus} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {
  DataRegion,
  SoilMatchForLocationOnly,
  SoilMatchForLocationWithData,
} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';
import {getTopMatch} from 'terraso-mobile-client/model/soilIdMatch/soilIdRanking';
import {findSelectedMatch} from 'terraso-mobile-client/model/soilMetadata/soilMetadataFunctions';
import {useSoilIdSelection} from 'terraso-mobile-client/model/soilMetadata/soilMetadataHooks';

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
    <Box variant="tile" p="18px">
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

      <ContainedButton
        stretchToFit
        rightIcon="chevron-right"
        onPress={onExploreDataPress}
        label={t('soil.explore_data')}
      />
    </Box>
  );
};

type LocationMatchDisplayProps = {coords: Coords};

const TempLocationMatchContent = ({coords}: LocationMatchDisplayProps) => {
  const soilIdOutput = useSoilIdOutput(coords);
  const topSoilMatch = useMemo(() => getTopMatch(soilIdOutput), [soilIdOutput]);

  return (
    <MatchContent
      status={soilIdOutput.status}
      dataRegion={soilIdOutput.dataRegion}
      match={topSoilMatch}
    />
  );
};

type SiteMatchDisplayProps = {coords: Coords; siteId: string};

const SiteMatchContent = ({coords, siteId}: SiteMatchDisplayProps) => {
  const soilIdOutput = useSoilIdOutput(coords, siteId);
  const topSoilMatch = useMemo(() => getTopMatch(soilIdOutput), [soilIdOutput]);
  const {selectedSoilId} = useSoilIdSelection(siteId);
  const selectedSoilMatch = findSelectedMatch(
    soilIdOutput.matches as SoilMatchForLocationWithData[],
    selectedSoilId,
  );

  return (
    <MatchContent
      status={soilIdOutput.status}
      match={selectedSoilMatch || topSoilMatch}
      dataRegion={soilIdOutput.dataRegion}
      isSelected={!!selectedSoilMatch}
    />
  );
};

type MatchContentProps = {
  status: SoilIdStatus;
  dataRegion: DataRegion;
  match: SoilMatchForLocationOnly | SoilMatchForLocationWithData | undefined;
  isSelected?: boolean;
};

const MatchContent = ({
  status,
  dataRegion,
  match,
  isSelected = false,
}: MatchContentProps) => {
  const {t} = useTranslation();

  return (
    <>
      <Text variant="body1" color="primary.contrast" mb="5px">
        <Text bold>
          {t(isSelected ? 'site.soil_id.matches.selected' : 'soil.top_match')}
          :{' '}
        </Text>
        <SoilIdStatusDisplay
          status={status}
          offline={<Text italic>{t('general.not_available_offine')}</Text>}
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
      {dataRegion === 'US' ? (
        <Text variant="body1" color="primary.contrast" mb="25px">
          <Text bold>{t('soil.ecological_site_name')}: </Text>
          <SoilIdStatusDisplay
            status={status}
            offline={<Text italic>{t('general.not_available_offine')}</Text>}
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
      ) : (
        <Box mb="25px" />
      )}
    </>
  );
};
