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

import {TFunction} from 'i18next';

import {Coords} from 'terraso-client-shared/types';

import {CarouselButtonWithAnimation} from 'terraso-mobile-client/components/buttons/CarouselButtonWithAnimation';
import {CarouselPage} from 'terraso-mobile-client/components/Carousel';
import {CarouselHeading} from 'terraso-mobile-client/components/CarouselHeading';
import {CarouselText} from 'terraso-mobile-client/components/CarouselText';
import {ScreenContentSection} from 'terraso-mobile-client/components/content/ScreenContentSection';
import {Text, View} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictByFlag} from 'terraso-mobile-client/components/restrictions/RestrictByFlag';
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

/* A hook rather than a module constant because the copy is translated, and t is only reachable during render. */
const useOverviewPages = (): CarouselPage[] => {
  const {t} = useTranslation();

  return useMemo(
    () =>
      EXAMPLE_ART.map((source, index) => {
        const page = `site.soil_id.overview.page_${index + 1}`;
        return {
          key: String(index + 1),
          image: {source},
          below: (
            <View>
              <CarouselHeading>{t(`${page}.title`)}</CarouselHeading>
              <CarouselText>{t(`${page}.info`)}</CarouselText>
            </View>
          ),
        };
      }),
    [t],
  );
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
      <RestrictByFlag flag="FF_testing">
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
