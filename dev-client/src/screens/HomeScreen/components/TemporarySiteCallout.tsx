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

import {useCallback} from 'react';
import {Button, Column, Divider, Row, Box} from 'native-base';
import {Coords} from 'terraso-mobile-client/model/map/mapSlice';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {useTranslation} from 'react-i18next';
import {Card} from 'terraso-mobile-client/components/Card';
import {CardCloseButton} from 'terraso-mobile-client/components/CardCloseButton';
import {CalloutDetail} from 'terraso-mobile-client/screens/HomeScreen/components/CalloutDetail';

const TEMP_SOIL_ID_VALUE = 'Clifton';
const TEMP_ECO_SITE_PREDICTION = 'Loamy Upland';
const TEMP_PRECIPITATION = '28 inches';
const TEMP_ELEVATION = '2800 feet';

type Props = {
  coords: Coords;
  closeCallout: () => void;
};

export const TemporarySiteCallout = ({coords, closeCallout}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const onCreate = useCallback(() => {
    navigation.navigate('CREATE_SITE', {coords});
    closeCallout();
  }, [closeCallout, navigation, coords]);

  const onLearnMore = useCallback(() => {
    navigation.navigate('LOCATION_DASHBOARD', {coords});
  }, [navigation, coords]);

  return (
    <Card buttons={<CardCloseButton onPress={closeCallout} />} isPopover={true}>
      <Column space="12px">
        <CalloutDetail
          label={t('site.soil_id_prediction').toUpperCase()}
          value={TEMP_SOIL_ID_VALUE.toUpperCase()}
        />
        <Divider />
        <CalloutDetail
          label={t('site.ecological_site_prediction').toUpperCase()}
          value={TEMP_ECO_SITE_PREDICTION.toUpperCase()}
        />
        <Divider />
        <CalloutDetail
          label={t('site.annual_precip_avg').toUpperCase()}
          value={TEMP_PRECIPITATION.toUpperCase()}
        />
        <Divider />
        <CalloutDetail
          label={t('site.elevation').toUpperCase()}
          value={TEMP_ELEVATION.toUpperCase()}
        />
        <Divider />
        <Row justifyContent="flex-end">
          <Button onPress={onCreate} size="sm" variant="outline">
            {t('site.create.title').toUpperCase()}
          </Button>
          <Box w="24px" />
          <Button onPress={onLearnMore} size="sm">
            {t('site.more_info').toUpperCase()}
          </Button>
        </Row>
      </Column>
    </Card>
  );
};
