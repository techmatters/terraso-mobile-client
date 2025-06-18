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

import {TFunction} from 'i18next';

import {TranslatedParagraph} from 'terraso-mobile-client/components/content/typography/TranslatedParagraph';
import {ExternalLink} from 'terraso-mobile-client/components/links/ExternalLink';
import {Column} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {
  DataRegion,
  getSoilMapSource,
} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';

type Props = {
  isSite: boolean;
  dataRegion: DataRegion;
};

export const TopSoilMatchesInfoContent = ({isSite, dataRegion}: Props) => {
  const {t} = useTranslation();

  return (
    <Column space="12px">
      <Column space="0px">
        {getInfoTextComponent(isSite, dataRegion, t)}
        <TranslatedParagraph i18nKey="site.soil_id.matches.info.description.need_help" />
      </Column>
      <ExternalLink
        label={t('general.learn_more')}
        url={t('site.soil_id.matches.info.description.learn_more_url')}
      />
    </Column>
  );
};

function getInfoTextComponent(
  isSite: boolean,
  dataRegion: DataRegion,
  t: TFunction,
) {
  const soilMapSource = t(getSoilMapSource(dataRegion));
  if (isSite) {
    if (dataRegion) {
      return (
        <TranslatedParagraph
          i18nKey="site.soil_id.matches.info.description.site"
          values={{soilMapSource}}
        />
      );
    } else
      return (
        <TranslatedParagraph i18nKey="site.soil_id.matches.info.description.site_region_unknown" />
      );
  } else {
    if (dataRegion) {
      return (
        <TranslatedParagraph
          i18nKey="site.soil_id.matches.info.description.temp_location"
          values={{soilMapSource}}
        />
      );
    } else
      return (
        <TranslatedParagraph i18nKey="site.soil_id.matches.info.description.temp_location_region_unknown" />
      );
  }
}
