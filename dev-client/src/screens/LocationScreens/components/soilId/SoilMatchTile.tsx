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

import {Pressable} from 'react-native';

import {TranslatedContent} from 'terraso-mobile-client/components/content/typography/TranslatedContent';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {Box, Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {formatPercent} from 'terraso-mobile-client/util';

type Props = {
  soilName: string;
  score: number;
  isSelected?: boolean;
  onPress: () => void;
};

export const SoilMatchTile = ({
  soilName,
  score,
  isSelected,
  onPress,
}: Props) => {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{disabled: !onPress}}
      onPress={onPress}>
      <Box
        variant="tile"
        alignItems="center"
        flexDirection="row"
        justifyContent="space-between"
        my="4px"
        py="6px">
        <Box marginHorizontal="16px" width="84px" justifyContent="center">
          {isSelected ? (
            <Text
              variant="match-tile-selected"
              color="primary.lighter"
              textAlign="center">
              <TranslatedContent i18nKey="site.soil_id.matches.selected" />
            </Text>
          ) : (
            <>
              <Text
                variant="match-tile-score"
                color="primary.lighter"
                textAlign="center">
                <TranslatedContent
                  i18nKey="site.soil_id.matches.match_score"
                  values={{score: formatPercent(score)}}
                />
              </Text>
              <Text
                variant="body2"
                color="primary.lighter"
                textAlign="center"
                mb="6px">
                <TranslatedContent i18nKey="site.soil_id.matches.match" />
              </Text>
            </>
          )}
        </Box>
        <Box flex={1} mr="12px" my="8px" flexDirection="row">
          <Text variant="match-tile-name" color="primary.contrast">
            {soilName}
          </Text>
        </Box>
        <Icon name="chevron-right" color="primary.contrast" mr="12px" />
      </Box>
    </Pressable>
  );
};
