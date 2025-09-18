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

import {TranslatedContent} from 'terraso-mobile-client/components/content/typography/TranslatedContent';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {Box, Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {DataRegion} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';
import {getSoilNameDisplayText} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/globalSoilI18nFunctions';
import {formatPercent} from 'terraso-mobile-client/util';

export type SoilMatchCardVariant = 'Default' | 'Rejected' | 'Selected';

type Props = {
  variant?: SoilMatchCardVariant;
  soilName: string;
  dataRegion: DataRegion;
  score: number;
  onPress: () => void;
};

export const SoilMatchCard = ({
  variant = 'Default',
  soilName,
  dataRegion,
  score,
  onPress,
}: Props) => {
  const {t, i18n} = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{disabled: !onPress}}
      onPress={onPress}>
      <Box
        variant={variant === 'Rejected' ? 'rejectedTile' : 'tile'}
        alignItems="center"
        flexDirection="row"
        justifyContent="space-between"
        my="4px"
        py="6px">
        <Box marginHorizontal="16px" width="84px" justifyContent="center">
          <MatchAppraisalDisplayText variant={variant} score={score} />
        </Box>
        <Box flex={1} mr="12px" my="8px" flexDirection="row">
          <Text
            variant="match-tile-name"
            color={
              variant === 'Rejected' ? 'text.primary' : 'primary.contrast'
            }>
            {getSoilNameDisplayText(soilName, dataRegion, t, i18n)}
          </Text>
        </Box>
        <Chevron variant={variant} />
      </Box>
    </Pressable>
  );
};

type MatchPercentDisplayProps = {
  variant: SoilMatchCardVariant;
  score: number;
};

const MatchAppraisalDisplayText = ({
  variant,
  score,
}: MatchPercentDisplayProps) => {
  if (variant === 'Selected') return <SelectedSoilDisplayText />;
  else return <MatchPercentDisplayText variant={variant} score={score} />;
};

const Chevron = ({variant}: {variant: SoilMatchCardVariant}) => {
  return (
    <Icon
      name="chevron-right"
      color={variant === 'Rejected' ? 'text.primary' : 'primary.contrast'}
      mr="12px"
    />
  );
};

const MatchPercentDisplayText = ({
  variant,
  score,
}: MatchPercentDisplayProps) => {
  const textColor = variant === 'Rejected' ? 'text.primary' : 'primary.lighter';
  return (
    <>
      <Text variant="match-tile-score" color={textColor} textAlign="center">
        <TranslatedContent
          i18nKey="site.soil_id.matches.match_score"
          values={{score: formatPercent(score)}}
        />
      </Text>
      <Text variant="body2" color={textColor} textAlign="center" mb="6px">
        <TranslatedContent i18nKey="site.soil_id.matches.match" />
      </Text>
    </>
  );
};

const SelectedSoilDisplayText = () => {
  return (
    <Text
      variant="match-tile-selected"
      color="primary.lighter"
      textAlign="center"
      paddingVertical="sm">
      <TranslatedContent i18nKey="site.soil_id.matches.selected" />
    </Text>
  );
};
