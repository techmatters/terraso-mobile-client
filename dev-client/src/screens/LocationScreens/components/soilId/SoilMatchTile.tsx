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

import {useTranslation} from 'react-i18next';
import {Pressable} from 'react-native';

import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {Box, Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {formatPercent} from 'terraso-mobile-client/util';

type Props = {soil_name: string; score: number; onPress: () => void};

export const SoilMatchTile = ({soil_name, score, onPress}: Props) => {
  const {t} = useTranslation();
  // TODO-cknipe: dp versus px?

  return (
    <Pressable onPress={onPress}>
      <Box
        variant="tile"
        alignItems="center"
        flexDirection="row"
        justifyContent="space-between"
        my="4px"
        py="4px">
        <Box marginHorizontal="16px" width="78px" justifyContent="center">
          <Text
            variant="score-tile"
            size="30px"
            fontWeight={400}
            color="primary.lighter"
            textAlign="center"
            mb="-6px">
            {formatPercent(score)}
          </Text>
          <Text
            variant="body2"
            color="primary.lighter"
            textAlign="center"
            mb="6px">
            {t('site.soil_id.matches.match')}
          </Text>
        </Box>

        <Box flex={1} mr="12px" my="8px" flexDirection="row">
          <Text variant="match-tile-name" color="primary.contrast">
            {soil_name}
          </Text>
        </Box>

        <Icon name="chevron-right" color="primary.contrast" mr="12px" />
      </Box>
    </Pressable>
  );
};
