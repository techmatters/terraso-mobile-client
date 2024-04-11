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
import {useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {DataInputSummary} from 'terraso-mobile-client/components/DataInputSummary';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {
  Column,
  Heading,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useSelector} from 'terraso-mobile-client/store';
import {
  selectSoilData,
  useSiteProjectSoilSettings,
} from 'terraso-client-shared/selectors';

type Props = {siteId: string};

export const SoilSurfaceStatus = ({siteId}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const projectSettings = useSiteProjectSoilSettings(siteId);
  const {surfaceCracksSelect} = useSelector(selectSoilData(siteId));

  const onPress = useCallback(() => {
    navigation.push('SOIL_SURFACE', {siteId});
  }, [navigation, siteId]);

  return (
    <Column space="1px">
      <Row backgroundColor="background.default" px="16px" py="12px">
        <Heading variant="h6">{t('soil.surface')}</Heading>
      </Row>
      <DataInputSummary
        required={projectSettings?.verticalCrackingRequired ?? false}
        complete={Boolean(surfaceCracksSelect)}
        label={t('soil.collection_method.verticalCracking')}
        value={t(`soil.vertical_cracking.value.${surfaceCracksSelect}`)}
        onPress={onPress}
      />
    </Column>
  );
};
