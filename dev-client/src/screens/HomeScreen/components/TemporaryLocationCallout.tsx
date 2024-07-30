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

import {
  DataBasedSoilMatch,
  LocationBasedSoilMatch,
} from 'terraso-client-shared/graphqlSchema/graphql';
import {useSoilIdData} from 'terraso-client-shared/soilId/soilIdHooks';
import {SoilIdStatus} from 'terraso-client-shared/soilId/soilIdSlice';
import {Coords} from 'terraso-client-shared/types';

import {CloseButton} from 'terraso-mobile-client/components/buttons/CloseButton';
import {Card} from 'terraso-mobile-client/components/Card';
import {
  Box,
  Column,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {SoilIdStatusDisplay} from 'terraso-mobile-client/components/SoilIdStatusDisplay';
import {renderElevation} from 'terraso-mobile-client/components/util/site';
import {useElevationData} from 'terraso-mobile-client/model/elevation/elevationHooks';
import {getTopMatch} from 'terraso-mobile-client/model/soilId/soilIdRanking';
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
  const topSoilMatch = useMemo(() => getTopMatch(soilIdData), [soilIdData]);

  const onCreate = useCallback(() => {
    navigation.navigate('CREATE_SITE', {
      coords,
      elevation: elevation.value,
    });
    closeCallout();
  }, [closeCallout, navigation, coords, elevation]);

  const onLearnMore = useCallback(() => {
    navigation.navigate('LOCATION_DASHBOARD', {
      coords,
      elevation: elevation.value,
    });
  }, [navigation, coords, elevation]);

  return (
    <Card
      Header={
        <LatLngDetail isCurrentLocation={isCurrentLocation} coords={coords} />
      }
      buttons={<CloseButton onPress={closeCallout} />}
      maxWidth="270px"
      isPopover={true}>
      <Column mt="12px" space="12px">
        <>
          <CalloutDetail
            label={t('site.soil_id_prediction')}
            value={
              <TopSoilMatchDisplay
                status={soilIdData.status}
                topSoilMatch={topSoilMatch}
                t={t}
              />
            }
          />
          <Divider />
          <CalloutDetail
            label={t('site.ecological_site_prediction')}
            value={
              <EcologicalSiteMatchDisplay
                status={soilIdData.status}
                topSoilMatch={topSoilMatch}
                t={t}
              />
            }
          />
          <Divider />
        </>
        <CalloutDetail
          label={t('site.elevation_label')}
          value={
            elevation.fetching ? (
              <ActivityIndicator size="small" />
            ) : (
              <Text bold>{renderElevation(t, elevation.value)}</Text>
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
      loading={<ActivityIndicator size="small" />}
      error={
        <Text bold textTransform="uppercase" color="error.main">
          {t('soil.error')}
        </Text>
      }
      noData={
        <Text bold textTransform="uppercase">
          {t('soil.no_matches')}
        </Text>
      }
      data={
        <Text bold textTransform="uppercase">
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
      loading={<ActivityIndicator size="small" />}
      error={
        <Text bold textTransform="uppercase" color="error.main">
          {t('soil.error')}
        </Text>
      }
      noData={
        <Text bold textTransform="uppercase">
          {t('soil.no_matches')}
        </Text>
      }
      data={
        <Text bold textTransform="uppercase">
          {topSoilMatch?.soilInfo.ecologicalSite?.name ?? t('soil.no_matches')}
        </Text>
      }
    />
  );
};
