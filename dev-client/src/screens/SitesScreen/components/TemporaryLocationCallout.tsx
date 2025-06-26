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

import {DataBasedSoilMatch} from 'terraso-client-shared/graphqlSchema/graphql';
import {Coords} from 'terraso-client-shared/types';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {CloseButton} from 'terraso-mobile-client/components/buttons/icons/common/CloseButton';
import {CreateSiteButton} from 'terraso-mobile-client/components/buttons/special/CreateSiteButton';
import {Card} from 'terraso-mobile-client/components/Card';
import {
  Box,
  Column,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {SoilIdStatusDisplay} from 'terraso-mobile-client/components/SoilIdStatusDisplay';
import {renderElevation} from 'terraso-mobile-client/components/util/site';
import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {useSoilIdOutput} from 'terraso-mobile-client/hooks/soilIdHooks';
import {useElevationData} from 'terraso-mobile-client/model/elevation/elevationHooks';
import {ElevationRecord} from 'terraso-mobile-client/model/elevation/elevationTypes';
import {SoilIdStatus} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {getTopMatch} from 'terraso-mobile-client/model/soilIdMatch/soilIdRanking';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {CalloutDetail} from 'terraso-mobile-client/screens/SitesScreen/components/CalloutDetail';
import {LatLngDetail} from 'terraso-mobile-client/screens/SitesScreen/components/LatLngDetail';

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
  const isOffline = useIsOffline();

  const elevation = useElevationData(coords);
  const soilIdOutput = useSoilIdOutput({coords});
  const topSoilMatch = useMemo(
    () => getTopMatch(soilIdOutput.matches),
    [soilIdOutput],
  );

  const onLearnMore = useCallback(() => {
    navigation.navigate('TEMP_LOCATION', {
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
      width="350px"
      isPopover={true}>
      <Column mt="12px" space="12px">
        <>
          <CalloutDetail
            label={t('site.soil_id_prediction')}
            value={
              <TopSoilMatchDisplay
                status={soilIdOutput.status}
                topSoilMatch={topSoilMatch}
                t={t}
              />
            }
          />
          {soilIdOutput.dataRegion === 'US' && (
            <>
              <Divider />
              <CalloutDetail
                label={t('site.ecological_site_prediction')}
                value={
                  <EcologicalSiteMatchDisplay
                    status={soilIdOutput.status}
                    topSoilMatch={topSoilMatch}
                    t={t}
                  />
                }
              />
            </>
          )}
          <Divider />
        </>
        <CalloutDetail
          label={t('site.elevation_label')}
          value={<ElevationDisplay elevation={elevation} t={t} />}
        />
        <Divider />
        <Row justifyContent="flex-end">
          <CreateSiteButton
            coords={coords}
            elevation={elevation.value}
            afterCreate={closeCallout}
            disabled={isOffline}
          />
          <Box w="24px" />
          <ContainedButton
            label={t('site.more_info')}
            onPress={onLearnMore}
            disabled={isOffline}
            size="sm"
          />
        </Row>
      </Column>
    </Card>
  );
};

type ElevationDisplayProps = {
  elevation: ElevationRecord;
  t: TFunction;
};

const ElevationDisplay = ({elevation, t}: ElevationDisplayProps) => {
  const isOffline = useIsOffline();

  if (isOffline) {
    return <NotAvailableOffline />;
  } else if (elevation.fetching) {
    return <ActivityIndicator size="small" />;
  } else {
    return <Text bold>{renderElevation(t, elevation.value)}</Text>;
  }
};

type SoilIdStatusDisplayTopMatchProps = {
  status: SoilIdStatus;
  topSoilMatch: DataBasedSoilMatch | undefined;
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
      offline={<NotAvailableOffline />}
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
      offline={<NotAvailableOffline />}
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

const NotAvailableOffline = () => {
  const {t} = useTranslation();

  return (
    <Text textTransform="uppercase" bold color="error.main">
      {t('general.not_available_offine')}
    </Text>
  );
};
