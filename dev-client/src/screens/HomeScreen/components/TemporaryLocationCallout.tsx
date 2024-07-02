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

import {useCallback, useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {ActivityIndicator, Divider} from 'react-native-paper';

import {TFunction} from 'i18next';
import {Button} from 'native-base';

import {useSoilIdData} from 'terraso-client-shared/soilId/soilIdHooks';
import {Coords} from 'terraso-client-shared/types';

import {CloseButton} from 'terraso-mobile-client/components/buttons/CloseButton';
import {Card} from 'terraso-mobile-client/components/Card';
import {
  Box,
  Column,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {renderElevation} from 'terraso-mobile-client/components/util/site';
import {useElevationData} from 'terraso-mobile-client/hooks/useElevationData';
import {getTopMatch} from 'terraso-mobile-client/model/soilId/soilIdRanking';
import {SoilIdData} from 'terraso-mobile-client/model/soilId/soilIdTypes';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {CalloutDetail} from 'terraso-mobile-client/screens/HomeScreen/components/CalloutDetail';
import {LatLngDetail} from 'terraso-mobile-client/screens/HomeScreen/components/LatLngDetail';

type Props = {
  coords: Coords;
  closeCallout: () => void;
  isCurrentLocation: boolean;
};

export const TemporaryLocationCallout = ({
  coords,
  closeCallout,
  isCurrentLocation,
}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const elevation = useElevationData(coords);
  const soilIdData = useSoilIdData(coords);
  const {soilMatchDisplay, ecologicalSiteDisplay} = useMemo(() => {
    return getSoilIdDetailDisplayValues(soilIdData, t);
  }, [soilIdData, t]);

  const onCreate = useCallback(() => {
    navigation.navigate('CREATE_SITE', {
      coords,
      elevation: elevation,
    });
    closeCallout();
  }, [closeCallout, navigation, coords, elevation]);

  const onLearnMore = useCallback(() => {
    navigation.navigate('LOCATION_DASHBOARD', {
      coords,
      elevation: elevation,
    });
  }, [navigation, coords, elevation]);

  return (
    <Card
      Header={
        <LatLngDetail isCurrentLocation={isCurrentLocation} coords={coords} />
      }
      buttons={<CloseButton onPress={closeCallout} />}
      isPopover={true}>
      <Column mt="12px" space="12px">
        <>
          <CalloutDetail
            label={t('site.soil_id_prediction')}
            value={soilMatchDisplay}
          />
          <Divider />
          <CalloutDetail
            label={t('site.ecological_site_prediction')}
            value={ecologicalSiteDisplay}
          />
          <Divider />
        </>
        <CalloutDetail
          label={t('site.elevation_label')}
          value={
            elevation ? (
              <Text bold textTransform="uppercase">
                {renderElevation(t, elevation)}
              </Text>
            ) : (
              <ActivityIndicator size="small" />
            )
          }
        />
        <Divider />
        <Row justifyContent="flex-end">
          <Button
            onPress={onCreate}
            _text={{textTransform: 'uppercase'}}
            size="sm"
            variant="outline">
            {t('site.create.title')}
          </Button>
          <Box w="24px" />
          <Button
            onPress={onLearnMore}
            _text={{textTransform: 'uppercase'}}
            size="sm">
            {t('site.more_info')}
          </Button>
        </Row>
      </Column>
    </Card>
  );
};

const getSoilIdDetailDisplayValues = (soilIdData: SoilIdData, t: TFunction) => {
  const topSoilMatch = getTopMatch(soilIdData);
  let soilMatchDisplay: React.ReactNode;
  let ecologicalSiteDisplay: React.ReactNode;
  if (soilIdData.status === 'loading') {
    soilMatchDisplay = <ActivityIndicator size="small" />;
    ecologicalSiteDisplay = <ActivityIndicator size="small" />;
  } else if (soilIdData.status === 'ready') {
    soilMatchDisplay = (
      <Text bold textTransform="uppercase">
        {topSoilMatch?.soilInfo.soilSeries.name ?? t('soil.no_matches')}
      </Text>
    );
    ecologicalSiteDisplay = (
      <Text bold textTransform="uppercase">
        {topSoilMatch?.soilInfo.ecologicalSite?.name ?? t('soil.no_matches')}
      </Text>
    );
  } else if (soilIdData.status === 'DATA_UNAVAILABLE') {
    soilMatchDisplay = (
      <Text bold textTransform="uppercase">
        {t('soil.no_matches')}
      </Text>
    );
    ecologicalSiteDisplay = (
      <Text bold textTransform="uppercase">
        {t('soil.no_matches')}
      </Text>
    );
  } else {
    soilMatchDisplay = (
      <Text bold textTransform="uppercase" color="error.main">
        {t('soil.error')}
      </Text>
    );
    ecologicalSiteDisplay = (
      <Text bold textTransform="uppercase" color="error.main">
        {t('soil.error')}
      </Text>
    );
  }
  return {soilMatchDisplay, ecologicalSiteDisplay};
};
