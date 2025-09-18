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

import {useTranslation} from 'react-i18next';
import {StyleSheet, View} from 'react-native';

import {Fab} from 'terraso-mobile-client/components/buttons/Fab';
import {TranslatedParagraph} from 'terraso-mobile-client/components/content/typography/TranslatedParagraph';
import {TranslatedSubHeading} from 'terraso-mobile-client/components/content/typography/TranslatedSubHeading';
import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RadioBlock} from 'terraso-mobile-client/components/RadioBlock';
import {FormOverlaySheet} from 'terraso-mobile-client/components/sheets/FormOverlaySheet';
import {theme} from 'terraso-mobile-client/theme';

type MatchRating = 'YES' | 'NO' | 'UNSURE';
export const RateSoilMatchFabWithSheet = () => {
  const {t} = useTranslation();
  let matchRating = 'UNSURE' as MatchRating;

  // TODO-cknipe: Do a real thing
  const onMatchRatingChanged = (value: MatchRating) => {
    console.log('switched to: ', value);
  };

  return (
    <FormOverlaySheet
      trigger={onOpen => (
        <Fab
          label={t('site.soil_id.matches.rate.fab')}
          onPress={onOpen}
          poisitioning="BottomCenter"
        />
      )}>
      <View style={styles.contentView}>
        <TranslatedSubHeading i18nKey="site.soil_id.matches.rate.title" />
        <Box height="md" />
        <TranslatedParagraph i18nKey="site.soil_id.matches.rate.description" />
        <RadioBlock
          options={{
            YES: {text: t('site.soil_id.matches.rate.yes')},
            NO: {text: t('site.soil_id.matches.rate.no')},
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
