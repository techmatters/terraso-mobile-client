import {useCallback} from 'react';
import {Button, Column, Divider, Row, Box} from 'native-base';
import {Coords} from '../../model/map/mapSlice';
import {useNavigation} from '../../screens/AppScaffold';
import {useTranslation} from 'react-i18next';
import {Card, CardCloseButton} from '../common/Card';
import {CalloutDetail} from './CalloutDetail';

const TEMP_SOIL_ID_VALUE = 'Clifton';
const TEMP_ECO_SITE_PREDICTION = 'Loamy Upland';
const TEMP_PRECIPITATION = '28 inches';
const TEMP_ELEVATION = '2800 feet';

type TemporarySiteCalloutProps = {
  coords: Coords;
  closeCallout: () => void;
};

export const TemporarySiteCallout = ({
  coords,
  closeCallout,
}: TemporarySiteCalloutProps) => {
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
    <Card buttons={<CardCloseButton onPress={closeCallout} />}>
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
