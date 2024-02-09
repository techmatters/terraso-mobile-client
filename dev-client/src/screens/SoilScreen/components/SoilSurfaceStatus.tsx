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

type Props = {siteId: string} & Pick<
  React.ComponentProps<typeof DataInputSummary>,
  'required' | 'complete'
>;

import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {
  Column,
  Heading,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

export const SoilSurfaceStatus = ({required, complete, siteId}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const onPress = useCallback(() => {
    navigation.push('SOIL_SURFACE', {siteId});
  }, [navigation, siteId]);

  return (
    <Column space="1px">
      <Row backgroundColor="background.default" px="16px" py="12px">
        <Heading variant="h6">{t('soil.surface')}</Heading>
      </Row>
      <DataInputSummary
        required={required}
        complete={complete}
        label={t('soil.collection_method.verticalCracking')}
        onPress={onPress}
      />
    </Column>
  );
};
