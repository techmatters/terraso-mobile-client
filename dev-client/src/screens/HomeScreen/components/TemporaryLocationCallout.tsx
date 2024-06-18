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
import {ActivityIndicator} from 'react-native-paper';

import {Button, Divider} from 'native-base';

import {Coords} from 'terraso-client-shared/types';

import {CloseButton} from 'terraso-mobile-client/components/buttons/CloseButton';
import {Card} from 'terraso-mobile-client/components/Card';
import {
  Box,
  Column,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {renderElevation} from 'terraso-mobile-client/components/util/site';
import {useSoilIdData} from 'terraso-mobile-client/hooks/soilIdHooks';
import {useElevationData} from 'terraso-mobile-client/hooks/useElevationData';
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
  const isSoilIdReady = soilIdData.status === 'ready';
  const topSoilMatch = useMemo(() => getTopMatch(soilIdData), [soilIdData]);

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
        {!isSoilIdReady && <ActivityIndicator size="small" />}
        {topSoilMatch && (
          <>
            <CalloutDetail
              label={t('site.soil_id_prediction')}
              value={topSoilMatch.soilInfo.soilSeries.name}
            />
            <Divider />
            <CalloutDetail
              label={t('site.ecological_site_prediction')}
              value={
                topSoilMatch.soilInfo.ecologicalSite?.name ??
                t('site.soil_id.soil_info.no_matches')
              }
            />
            <Divider />
          </>
        )}
        {elevation ? (
          <CalloutDetail
            label={t('site.elevation_label')}
            value={renderElevation(t, elevation)}
          />
        ) : (
          <ActivityIndicator size="small" />
        )}
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
