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
import {StyleSheet} from 'react-native';

import {TFunction} from 'i18next';

import {Coords} from 'terraso-client-shared/types';

import {TutorialCarouselButton} from 'terraso-mobile-client/components/buttons/TutorialCarouselButton';
import {CarouselPage} from 'terraso-mobile-client/components/Carousel';
import {ScreenContentSection} from 'terraso-mobile-client/components/content/ScreenContentSection';
import {
  Heading,
  Text,
  View,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useSoilIdOutput} from 'terraso-mobile-client/hooks/soilIdHooks';
import {DataRegion} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';

type SoilIdDescriptionSectionProps = {
  siteId?: string;
  coords: Coords;
};

const SHOVEL_ANIMATION = require('terraso-mobile-client/assets/animations/soil-shovel-icon.json');

/* TODO-cknipe: Remove this test-only example content & icon further below
Placeholder content to eyeball the carousel; real art and copy TBD. */
const EXAMPLE_ART = [
  require('terraso-mobile-client/assets/carousel-soilid/1.jpg'),
  require('terraso-mobile-client/assets/carousel-soilid/2.jpg'),
  require('terraso-mobile-client/assets/carousel-soilid/3.jpg'),
  require('terraso-mobile-client/assets/carousel-soilid/4.jpg'),
];

/* Declared above PAGES because the JSX below is built at module load and would otherwise read styles in its temporal dead zone. */
const styles = StyleSheet.create({
  heading: {
    textAlign: 'center',
    paddingBottom: 16,
  },
});

const PAGES: CarouselPage[] = [1, 2, 3, 4].map(n => ({
  key: String(n),
  image: {source: EXAMPLE_ART[n - 1]},
  below: (
    <View>
      <Heading variant="h5" style={styles.heading}>
        Page {n}
      </Heading>
      <Text variant="pCarousel">You can put ANYTHING in here</Text>
      <Text variant="pCarousel">
        Wooooooow look at how much text there is here -- So much text! Wow! So
        much. It's text. HELLOOOOOOOOOOO as;ldf asdf asdf asdf asd a b c d e f g
        h i j k l m n o p q r s t u v w x y z AND AGAIN! a b c d e f g h i j k l
        m n o p q r s t u v w x y z NEVER STOP NEvER STOPPING \n \n a
      </Text>
      <Text variant="pCarousel">
        test text test text test text test text test text test text test text
        test text test text test text test text test text test text test text
        test text test text test text test text test text test text test text
        test text test text test text test text test text test text test text
        test text test text test text test text test text test text test text
        test text test text test text test text test text
      </Text>
    </View>
  ),
}));

export const SoilIdDescriptionSection = ({
  siteId,
  coords,
}: SoilIdDescriptionSectionProps) => {
  const {t} = useTranslation();
  const input = siteId ? {siteId} : {coords};
  const soilIdOutput = useSoilIdOutput(input);
  const dataRegion = soilIdOutput.dataRegion;

  return (
    <ScreenContentSection title={t('site.soil_id.title')}>
      <TutorialCarouselButton
        tutorialKey="soil-id-how-it-works"
        contentVersion={1}
        label={t('site.soil_id.how_it_works')}
        animation={SHOVEL_ANIMATION}
        pages={PAGES}
        aboveHeight="60%"
      />
      <Text variant="body1">{getText(siteId, dataRegion, t)}</Text>
    </ScreenContentSection>
  );
};

const getText = (
  siteId: string | undefined,
  dataRegion: DataRegion,
  t: TFunction,
) => {
  if (siteId) {
    return dataRegion === 'US'
      ? t('site.soil_id.description.site_US')
      : t('site.soil_id.description.site_global_or_unknown');
  } else {
    return t('site.soil_id.description.temp_location');
  }
};
