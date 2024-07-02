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

import {useSoilIdData} from 'terraso-client-shared/soilId/soilIdHooks';
import {Coords} from 'terraso-client-shared/types';

import StackedBarChart from 'terraso-mobile-client/assets/stacked-bar.svg';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {
  Box,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {getTopMatch} from 'terraso-mobile-client/model/soilId/soilIdRanking';
import {SoilIdData} from 'terraso-mobile-client/model/soilId/soilIdTypes';

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
  const {soilIdMatchText, ecologicalSiteText} = useMemo(() => {
    return getSoilIdDetailDisplayValues(soilIdData, t);
  }, [soilIdData, t]);

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
        <Text>{soilIdMatchText}</Text>
      </Text>
      <Text variant="body1" color="primary.contrast" mb="25px">
        <Text bold>{t('soil.ecological_site_name')}: </Text>
        <Text>{ecologicalSiteText}</Text>
      </Text>

      <Button
        w="95%"
        _text={{textTransform: 'uppercase'}}
        rightIcon={<Icon name="chevron-right" />}
        onPress={onExploreDataPress}>
        {t('soil.explore_data')}
      </Button>
    </Box>
  );
};

const getSoilIdDetailDisplayValues = (soilIdData: SoilIdData, t: TFunction) => {
  const topSoilMatch = getTopMatch(soilIdData);
  let soilIdMatchText: string;
  let ecologicalSiteText: string;
  if (soilIdData.status === 'loading') {
    soilIdMatchText = t('soil.loading');
    ecologicalSiteText = t('soil.loading');
  } else if (soilIdData.status === 'DATA_UNAVAILABLE') {
    soilIdMatchText = t('soil.no_matches');
    ecologicalSiteText = t('soil.no_matches');
  } else if (soilIdData.status === 'ready') {
    soilIdMatchText =
      topSoilMatch?.soilInfo.soilSeries.name ?? t('soil.no_matches');
    ecologicalSiteText =
      topSoilMatch?.soilInfo.ecologicalSite?.name ?? t('soil.no_matches');
  } else {
    soilIdMatchText = t('soil.error');
    ecologicalSiteText = t('soil.error');
  }
  return {soilIdMatchText, ecologicalSiteText};
};
