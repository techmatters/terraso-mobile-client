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

import {i18n as i18nType, TFunction} from 'i18next';

import {SoilSeries} from 'terraso-client-shared/graphqlSchema/graphql';

import {DataRegion} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';

// As of 2025-07 we only expect global (not US) soil match descriptions to come from the client-side i18n files.

export function getSoilNameDisplayText(
  soilSeriesName: string,
  dataRegion: DataRegion,
  t: TFunction,
  i18n: i18nType,
) {
  if (
    dataRegion === 'GLOBAL' &&
    i18n.exists(getGlobalSoilI18nNameKey(soilSeriesName))
  ) {
    return t(getGlobalSoilI18nNameKey(soilSeriesName));
  } else {
    return soilSeriesName;
  }
}

export function getGlobalSoilSeriesDisplayText(
  soilSeries: SoilSeries,
  t: TFunction,
  i18n: i18nType,
) {
  const globalSoilKey = getGlobalSoilI18nKey(soilSeries.name);

  if (i18n.exists(globalSoilKey)) {
    const soilSeriesTextForDisplay: SoilSeries = {
      name: i18n.exists(`${globalSoilKey}.name`)
        ? t(`${globalSoilKey}.name`)
        : soilSeries.name,
      description: i18n.exists(`${globalSoilKey}.description`)
        ? t(`${globalSoilKey}.description`)
        : soilSeries.description,
      management: i18n.exists(`${globalSoilKey}.management`)
        ? t(`${globalSoilKey}.management`)
        : soilSeries.management,
      fullDescriptionUrl: soilSeries.fullDescriptionUrl ?? undefined,
      taxonomySubgroup: soilSeries.taxonomySubgroup ?? undefined,
    };
    return soilSeriesTextForDisplay;
  } else {
    return soilSeries;
  }
}

function getGlobalSoilI18nNameKey(soilSeriesName: string) {
  return `${getGlobalSoilI18nKey(soilSeriesName)}.name`;
}

function getGlobalSoilI18nKey(soilSeriesName: string) {
  return `soil.match_info.${getNormalizedSoilName(soilSeriesName)}`;
}

function getNormalizedSoilName(soilSeriesName: string) {
  return soilSeriesName.trim().toLowerCase().replace(/ /g, '_');
}
