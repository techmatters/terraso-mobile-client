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
import {useTranslation} from 'react-i18next';
import {Divider} from 'react-native-paper';

import {ScrollView} from 'native-base';

import {
  selectSoilData,
  useSiteProjectSoilSettings,
} from 'terraso-client-shared/selectors';

import {DataInputSummary} from 'terraso-mobile-client/components/DataInputSummary';
import {
  Heading,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {InfoOverlaySheetButton} from 'terraso-mobile-client/components/sheets/InfoOverlaySheetButton';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {SlopeInfoContent} from 'terraso-mobile-client/screens/SlopeScreen/components/SlopeInfoContent';
import {
  renderShape,
  renderSteepness,
} from 'terraso-mobile-client/screens/SlopeScreen/utils/renderValues';
import {useSelector} from 'terraso-mobile-client/store';

export const SlopeScreen = ({siteId}: {siteId: string}) => {
  const {t} = useTranslation();
  const soilData = useSelector(selectSoilData(siteId));
  const required = useSiteProjectSoilSettings(siteId)?.slopeRequired ?? false;
  const navigation = useNavigation();

  const steepnessValue = renderSteepness(t, soilData);
  const shapeValue = renderShape(t, soilData);

  const onSteepness = useCallback(
    () => navigation.push('SLOPE_STEEPNESS', {siteId}),
    [navigation, siteId],
  );

  const onShape = useCallback(
    () => navigation.push('SLOPE_SHAPE', {siteId}),
    [navigation, siteId],
  );

  return (
    <ScrollView backgroundColor="grey.300">
      <Row backgroundColor="primary.contrast" p="15px" alignItems="center">
        <Heading variant="h6">{t('slope.title')}</Heading>
        <InfoOverlaySheetButton Header={t('slope.info.title')}>
          <SlopeInfoContent />
        </InfoOverlaySheetButton>
      </Row>
      <DataInputSummary
        required={required}
        complete={steepnessValue !== undefined}
        label={t('slope.steepness.short_title')}
        value={steepnessValue}
        onPress={onSteepness}
      />
      <Divider />
      <DataInputSummary
        required={required}
        complete={shapeValue !== undefined}
        label={t('slope.shape.title')}
        value={shapeValue}
        onPress={onShape}
      />
    </ScrollView>
  );
};
