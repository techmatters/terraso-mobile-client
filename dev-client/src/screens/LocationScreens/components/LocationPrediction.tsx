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

import {TFunction} from 'i18next';
import {Button} from 'native-base';

import {
  DataBasedSoilMatch,
  LocationBasedSoilMatch,
} from 'terraso-client-shared/graphqlSchema/graphql';
import {useSoilIdData} from 'terraso-client-shared/soilId/soilIdHooks';
import {SoilIdStatus} from 'terraso-client-shared/soilId/soilIdSlice';
import {Coords} from 'terraso-client-shared/types';

import StackedBarChart from 'terraso-mobile-client/assets/stacked-bar.svg';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {
  Box,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {SoilIdStatusDisplay} from 'terraso-mobile-client/components/SoilIdStatusDisplay';
import {getTopMatch} from 'terraso-mobile-client/model/soilId/soilIdRanking';

type LocationPredictionProps = {
  label: string;
  coords: Coords;
  siteId?: string;
  onExploreDataPress: () => void;
};

export const LocationPrediction = ({
  label,
  coords,
  siteId,
  onExploreDataPress,
}: LocationPredictionProps) => {
  const {t} = useTranslation();

  const soilIdData = useSoilIdData(coords, siteId);
  const topSoilMatch = useMemo(() => getTopMatch(soilIdData), [soilIdData]);

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
          {label}
        </Text>
      </Row>
      <Box h="15px" />
      <Text variant="body1" color="primary.contrast" mb="5px">
        <Text bold>{t('soil.top_match')}: </Text>
        <TopSoilMatchDisplay
          status={soilIdData.status}
          topSoilMatch={topSoilMatch}
          t={t}
        />
      </Text>
      <Text variant="body1" color="primary.contrast" mb="25px">
        <Text bold>{t('soil.ecological_site_name')}: </Text>
        <EcologicalSiteMatchDisplay
          status={soilIdData.status}
          topSoilMatch={topSoilMatch}
          t={t}
        />
      </Text>

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

type SoilIdStatusDisplayTopMatchProps = {
  status: SoilIdStatus;
  topSoilMatch: LocationBasedSoilMatch | DataBasedSoilMatch | undefined;
  t: TFunction;
};

const TopSoilMatchDisplay = ({
  status,
  topSoilMatch,
  t,
}: SoilIdStatusDisplayTopMatchProps) => {
  return (
    <SoilIdStatusDisplay
      status={status}
      loading={<Text>{t('soil.loading')}</Text>}
      error={<Text>{t('soil.error')}</Text>}
      noData={<Text>{t('soil.no_matches')}</Text>}
      data={
        <Text>
          {topSoilMatch?.soilInfo.soilSeries.name ?? t('soil.no_matches')}
        </Text>
      }
    />
  );
};

const EcologicalSiteMatchDisplay = ({
  status,
  topSoilMatch,
  t,
}: SoilIdStatusDisplayTopMatchProps) => {
  return (
    <SoilIdStatusDisplay
      status={status}
      loading={<Text>{t('soil.loading')}</Text>}
      error={<Text>{t('soil.error')}</Text>}
      noData={<Text>{t('soil.no_matches')}</Text>}
      data={
        <Text>
          {topSoilMatch?.soilInfo.ecologicalSite?.name ?? t('soil.no_matches')}
        </Text>
      }
    />
  );
};
