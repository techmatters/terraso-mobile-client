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
import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import {useTranslation} from 'react-i18next';

import {
  Column,
  Heading,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

export const RockFragmentVolumeInfoContent = () => {
  const {t} = useTranslation();

  return (
    <BottomSheetScrollView>
      <Column space={3} pb="65%" pt={5} px={5} mt="48px">
        <Heading w="full" textAlign="left">
          {t('texture.fragment.info.title')}
        </Heading>
        <Text variant="body1">{t('texture.fragment.info.description1')}</Text>
      </Column>
    </BottomSheetScrollView>
  );
};
