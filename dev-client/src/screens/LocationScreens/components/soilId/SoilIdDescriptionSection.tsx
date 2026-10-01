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

import {useMemo} from 'react';
import {useTranslation} from 'react-i18next';
import {ImageSourcePropType, StyleSheet} from 'react-native';

import {TFunction} from 'i18next';

import {Coords} from 'terraso-client-shared/types';

import {CarouselButtonWithAnimation} from 'terraso-mobile-client/components/buttons/CarouselButtonWithAnimation';
import {CloseModalButton} from 'terraso-mobile-client/components/buttons/CloseModalButton';
import {CarouselPage} from 'terraso-mobile-client/components/Carousel';
import {CarouselHeading} from 'terraso-mobile-client/components/CarouselHeading';
import {CarouselText} from 'terraso-mobile-client/components/CarouselText';
import {ScreenContentSection} from 'terraso-mobile-client/components/content/ScreenContentSection';
import {ExternalLink} from 'terraso-mobile-client/components/links/ExternalLink';
import {Text, View} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictByFlag} from 'terraso-mobile-client/components/restrictions/RestrictByFlag';
import {useSoilIdOutput} from 'terraso-mobile-client/hooks/soilIdHooks';
import {DataRegion} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';
import {theme} from 'terraso-mobile-client/theme';

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

/* A hook rather than a module constant because the copy is translated, and t is only reachable during render. */
const useOverviewPages = (): CarouselPage[] => {
  const {t} = useTranslation();

  return useMemo(() => {
    /* Pages share a heading-over-copy shell; extra carries whatever a page adds below it. */
    const page = (
      key: string,
      source: ImageSourcePropType,
      extra?: React.ReactNode,
    ): CarouselPage => ({
      key,
      image: {source},
      below: (
        <View>
          <CarouselHeading>
            {t(`site.soil_id.overview.${key}.title`)}
          </CarouselHeading>
          <CarouselText>{t(`site.soil_id.overview.${key}.info`)}</CarouselText>
          {extra}
        </View>
      ),
    });

    return [
      page('page_1', EXAMPLE_ART[0]),
      page('page_2', EXAMPLE_ART[1]),
      page(
        'page_3',
        EXAMPLE_ART[2],
        <>
          <View style={styles.spacerSm} />
          <View style={styles.pageAction}>
            <ExternalLink
              label={t('site.soil_id.overview.page_3.link_text')}
              url={t('site.soil_id.overview.page_3.link_url')}
            />
          </View>
        </>,
      ),
      /* The closer lives on the last page because that is where the overview ends, not because the carousel knows about it. */
      page(
        'page_4',
        EXAMPLE_ART[3],
        <>
          <View style={styles.spacerMd} />
          <View style={styles.pageAction}>
            <CloseModalButton label={t('general.carousel.got_it')} />
          </View>
        </>,
      ),
    ];
  }, [t]);
};

export const SoilIdDescriptionSection = ({
  siteId,
  coords,
}: SoilIdDescriptionSectionProps) => {
  const {t} = useTranslation();
  const input = siteId ? {siteId} : {coords};
  const soilIdOutput = useSoilIdOutput(input);
  const dataRegion = soilIdOutput.dataRegion;
  const pages = useOverviewPages();

  return (
    <ScreenContentSection title={t('site.soil_id.title')}>
      <RestrictByFlag flag="FF_redesign">
        <CarouselButtonWithAnimation
          overviewKey="soil-id"
          contentVersion={1}
          animation={SHOVEL_ANIMATION}
          pages={pages}
        />
      </RestrictByFlag>
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

const styles = StyleSheet.create({
  /* A row, so centering is on the main axis: links and buttons both set alignSelf: 'flex-start' on themselves, which would override alignItems here. */
  pageAction: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  spacerSm: {
    height: theme.space.sm,
  },
  spacerMd: {
    height: theme.space.md,
  },
});
