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

import {Fab} from 'terraso-mobile-client/components/buttons/Fab';
import {TranslatedParagraph} from 'terraso-mobile-client/components/content/typography/TranslatedParagraph';
import {TranslatedSubHeading} from 'terraso-mobile-client/components/content/typography/TranslatedSubHeading';
import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RadioBlock} from 'terraso-mobile-client/components/RadioBlock';
import {FormOverlaySheet} from 'terraso-mobile-client/components/sheets/FormOverlaySheet';
import {useUserRating} from 'terraso-mobile-client/model/soilMetadata/soilMetadataHooks';
import {localUpdateUserRatings} from 'terraso-mobile-client/model/soilMetadata/soilMetadataSlice';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {selectSite} from 'terraso-mobile-client/store/selectors';
import {theme} from 'terraso-mobile-client/theme';

type Props = {
  siteId: string;
  soilMatch: SoilMatch;
};

export const RateSoilMatchFabWithSheet = ({siteId, soilMatch}: Props) => {
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

      // Get all three scores separately
      const locationScore = soilMatch?.locationMatch?.score ?? 0;
      const propertiesScore = soilMatch?.dataMatch?.score ?? 0;
      const combinedScore = soilMatch?.combinedMatch?.score ?? 0;

      const soil_rank =
        soilMatch?.combinedMatch?.rank ?? soilMatch?.locationMatch?.rank ?? 0;

      posthog?.capture('soil_match_rating', {
        rating: matchRating.toLowerCase(),
        site_name: site?.name ?? 'unknown',
        soil_name: soilMatch?.soilInfo?.soilSeries?.name || 'unknown',
        soil_location_score: locationScore,
        soil_properties_score: propertiesScore,
        soil_combined_score: combinedScore,
        soil_rank: soil_rank,
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
