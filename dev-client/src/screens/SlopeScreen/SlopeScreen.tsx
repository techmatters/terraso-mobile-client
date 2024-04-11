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
import {useCallback, useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {useSelector} from 'terraso-mobile-client/store';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {DataInputSummary} from 'terraso-mobile-client/components/DataInputSummary';
import {
  renderShape,
  renderSteepness,
} from 'terraso-mobile-client/screens/SlopeScreen/utils/renderValues';
import {
  Column,
  Row,
  Heading,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {
  selectSoilData,
  useSiteProjectSoilSettings,
} from 'terraso-client-shared/selectors';
import {IconButton} from 'terraso-mobile-client/components/Icons';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {BasicInfoModal} from 'terraso-mobile-client/components/infoModals/BasicInfoModal';
import {SlopeInfoContent} from 'terraso-mobile-client/screens/SlopeScreen/components/SlopeInfoContent';

export const SlopeScreen = ({siteId}: {siteId: string}) => {
  const {t} = useTranslation();
  const soilData = useSelector(selectSoilData(siteId));
  const required = useSiteProjectSoilSettings(siteId)?.slopeRequired ?? false;
  const navigation = useNavigation();

  const infoBottomSheetRef = useRef<BottomSheetModal>(null);
  const onInfoPress = useCallback(
    () => infoBottomSheetRef.current?.present(),
    [infoBottomSheetRef],
  );
  const onInfoClose = useCallback(
    () => infoBottomSheetRef.current?.dismiss(),
    [infoBottomSheetRef],
  );

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
    <>
      <Column space="1px">
        <Row backgroundColor="primary.contrast" p="15px" alignItems="center">
          <Heading variant="h6">{t('slope.title')}</Heading>
          <IconButton
            name="info"
            onPress={onInfoPress}
            size="md"
            _icon={{color: 'primary'}}
          />
        </Row>
        <DataInputSummary
          required={required}
          complete={steepnessValue !== undefined}
          label={t('slope.steepness.short_title').toLocaleUpperCase()}
          value={steepnessValue}
          onPress={onSteepness}
        />
        <DataInputSummary
          required={required}
          complete={shapeValue !== undefined}
          label={t('slope.shape.title').toLocaleUpperCase()}
          value={shapeValue}
          onPress={onShape}
        />
      </Column>
      <BasicInfoModal ref={infoBottomSheetRef} onClose={onInfoClose}>
        <SlopeInfoContent />
      </BasicInfoModal>
    </>
  );
};
