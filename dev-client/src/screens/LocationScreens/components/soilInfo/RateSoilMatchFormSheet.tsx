/*
 * Copyright © 2025 Technology Matters
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

import {useCallback, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {StyleSheet, View} from 'react-native';

import {usePostHog} from 'posthog-react-native';

import {
  SoilMatch,
  SoilMetadataUpdateMutationInput,
  UserMatchRating,
  UserRatingInput,
} from 'terraso-client-shared/graphqlSchema/graphql';
import {Site} from 'terraso-client-shared/site/siteTypes';
import {SoilData} from 'terraso-client-shared/soilId/soilIdTypes';

import {Fab} from 'terraso-mobile-client/components/buttons/Fab';
import {TranslatedParagraph} from 'terraso-mobile-client/components/content/typography/TranslatedParagraph';
import {TranslatedSubHeading} from 'terraso-mobile-client/components/content/typography/TranslatedSubHeading';
import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RadioBlock} from 'terraso-mobile-client/components/RadioBlock';
import {FormOverlaySheet} from 'terraso-mobile-client/components/sheets/FormOverlaySheet';
import {useUserRating} from 'terraso-mobile-client/model/soilMetadata/soilMetadataHooks';
import {localUpdateUserRatings} from 'terraso-mobile-client/model/soilMetadata/soilMetadataSlice';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {
  selectSite,
  selectSoilData,
} from 'terraso-mobile-client/store/selectors';
import {theme} from 'terraso-mobile-client/theme';

type Props = {
  siteId: string;
  siteName: string;
  soilMatch: SoilMatch;
};

type InputCounts = {
  numberOfInputs: number;
  uniqueInputTypes: string[];
};

// Helper function to count soil data inputs
function countSoilDataInputs(soilData: SoilData | undefined): InputCounts {
  if (!soilData) {
    return {numberOfInputs: 0, uniqueInputTypes: []};
  }

  let count = 0;
  const inputTypes = new Set<string>();

  // Check soil cracks
  if (soilData.surfaceCracksSelect) {
    count++;
    inputTypes.add('soil_cracks');
  }

  // Check slope steepness
  if (
    soilData.slopeSteepnessSelect ||
    soilData.slopeSteepnessPercent ||
    soilData.slopeSteepnessDegree
  ) {
    count++;
    inputTypes.add('slope');
  }

  // Check slope shape (both cross and down slope needed)
  if (soilData.crossSlope && soilData.downSlope) {
    count++;
    inputTypes.add('shape');
  }

  // Check depth-dependent data
  for (const depthData of soilData.depthDependentData) {
    // Soil texture
    if (depthData.texture) {
      count++;
      inputTypes.add('soil_texture');
    }

    // Rock fragment volume
    if (depthData.rockFragmentVolume) {
      count++;
      inputTypes.add('rock_fragment_volume');
    }

    // Soil color (all three components must be present)
    if (
      depthData.colorHue !== null &&
      depthData.colorHue !== undefined &&
      depthData.colorValue !== null &&
      depthData.colorValue !== undefined &&
      depthData.colorChroma !== null &&
      depthData.colorChroma !== undefined
    ) {
      count++;
      inputTypes.add('soil_color');
    }
  }

  return {
    numberOfInputs: count,
    uniqueInputTypes: Array.from(inputTypes).sort(),
  };
}

export const RateSoilMatchFabWithSheet = ({
  siteId,
  siteName,
  soilMatch,
}: Props) => {
  const {t} = useTranslation();
  const posthog = usePostHog();
  const dispatch = useDispatch();
  const site: Site | undefined =
    useSelector(state => selectSite(siteId)(state)) ?? undefined;

  // TODO-cknipe: What if the soilMatch disappears? ScreenDataRequirements?
  const soilMatchId = soilMatch.soilInfo.soilSeries.name;
  const existingRating = useUserRating(siteId, soilMatchId);

  // TODO-cknipe: Remove this and use the redux instead... a selector?
  // TODO-cknipe: Does posthog capture stuff from offline activity?
  const [matchRating, setMatchRating] =
    useState<UserMatchRating>(existingRating);
  const soilData = useSelector(
    siteId ? selectSoilData(siteId) : () => undefined,
  );
  const onMatchRatingChanged = useCallback(
    (value: UserMatchRating) => {
      setMatchRating(value);

      const newRatings: Array<UserRatingInput> = [
        {
          soilMatchId,
          rating: value,
        },
      ];
      const input: SoilMetadataUpdateMutationInput = {
        siteId,
        userRatings: newRatings,
      };
      dispatch(localUpdateUserRatings(input));
      // TODO-cknipe: Add to the offline transactions
      // TODO-cknipe: Do we need a client mutation id?
    },
    [soilMatchId, siteId, dispatch],
  );

  const [isClosing, setIsClosing] = useState(false);
  const handleSheetClose = () => {
    // Track the rating event when sheet is closed
    if (!isClosing) {
      setIsClosing(true);

      // Count inputs from soil data
      const {numberOfInputs, uniqueInputTypes} = countSoilDataInputs(soilData);

      // Get all three scores separately
      const locationScore = soilMatch?.locationMatch?.score ?? 0;
      const propertiesScore = soilMatch?.dataMatch?.score ?? 0;
      const combinedScore = soilMatch?.combinedMatch?.score ?? 0;

      // Get rank (0-based: 0 = top match, 1 = second, etc.)
      const soil_rank =
        soilMatch?.combinedMatch?.rank ?? soilMatch?.locationMatch?.rank ?? -1;

      posthog?.capture('soil_match_rating', {
        rating: matchRating.toLowerCase(),
        site_name: site?.name ?? 'unknown',
        soil_name: soilMatch?.soilInfo?.soilSeries?.name || 'unknown',
        soil_location_score: locationScore,
        soil_properties_score: propertiesScore,
        soil_combined_score: combinedScore,
        soil_rank: soil_rank,
        number_of_inputs: numberOfInputs,
        unique_input_types: uniqueInputTypes,
        rank_of_rated_soil: soil_rank,
      });
    }
  };

  return (
    <FormOverlaySheet
      trigger={onOpen => (
        <Fab
          label={t('site.soil_id.matches.rate.fab')}
          onPress={() => {
            setIsClosing(false);
            onOpen();
          }}
          positioning="BottomCenter"
        />
      )}
      onClose={handleSheetClose}>
      <View style={styles.contentView}>
        <TranslatedSubHeading i18nKey="site.soil_id.matches.rate.title" />
        <Box height="md" />
        <TranslatedParagraph i18nKey="site.soil_id.matches.rate.description" />
        <RadioBlock
          options={{
            SELECTED: {text: t('site.soil_id.matches.rate.yes')},
            REJECTED: {text: t('site.soil_id.matches.rate.no')},
            UNSURE: {text: t('site.soil_id.matches.rate.unsure')},
          }}
          groupProps={{
            value: matchRating,
            name: 'match-rating',
            onChange: onMatchRatingChanged,
          }}
        />
      </View>
    </FormOverlaySheet>
  );
};

const styles = StyleSheet.create({
  contentView: {
    padding: theme.space.md,
  },
});
