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

import {InfoButton} from 'terraso-mobile-client/components/buttons/icons/common/InfoButton';
import {HelpContentSpacer} from 'terraso-mobile-client/components/content/HelpContentSpacer';
import {TranslatedHeading} from 'terraso-mobile-client/components/content/typography/TranslatedHeading';
import {DataInputSummary} from 'terraso-mobile-client/components/DataInputSummary';
import {useNavToBottomTabsAndShowSyncError} from 'terraso-mobile-client/components/dataRequirements/handleMissingData';
import {
  ScreenDataRequirements,
  useMemoizedRequirements,
} from 'terraso-mobile-client/components/dataRequirements/ScreenDataRequirements';
import {
  Heading,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {SlopeInfoContent} from 'terraso-mobile-client/screens/SlopeScreen/components/SlopeInfoContent';
import {
  renderShape,
  renderSteepness,
} from 'terraso-mobile-client/screens/SlopeScreen/utils/renderValues';
import {useSelector} from 'terraso-mobile-client/store';
import {
  selectSite,
  selectSoilData,
  useSiteProjectSoilSettings,
} from 'terraso-mobile-client/store/selectors';

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

  const site = useSelector(selectSite(siteId));
  const handleMissingSite = useNavToBottomTabsAndShowSyncError();
  const requirements = useMemoizedRequirements([
    {data: site, doIfMissing: handleMissingSite},
  ]);

  return (
    <ScreenDataRequirements requirements={requirements}>
      {() => (
        <ScrollView backgroundColor="grey.300">
          <Row backgroundColor="primary.contrast" p="15px" alignItems="center">
            <Heading variant="h6">{t('slope.title')}</Heading>
            <HelpContentSpacer />
            <InfoButton
              sheetHeading={<TranslatedHeading i18nKey="slope.info.title" />}>
              <SlopeInfoContent siteId={siteId} />
            </InfoButton>
          </Row>
          <Divider />
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
      )}
    </ScreenDataRequirements>
  );
};
