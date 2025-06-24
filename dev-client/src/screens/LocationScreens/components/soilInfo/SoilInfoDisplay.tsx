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

import {i18n as i18nType, TFunction} from 'i18next';

import {
  LandCapabilityClass,
  SoilInfo,
  SoilSeries,
} from 'terraso-client-shared/graphqlSchema/graphql';

import {TranslatedParagraph} from 'terraso-mobile-client/components/content/typography/TranslatedParagraph';
import {ExternalLink} from 'terraso-mobile-client/components/links/ExternalLink';
import {
  Box,
  Column,
  Heading,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {DataRegion} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';

type SoilInfoDisplayProps = {
  dataRegion: DataRegion;
  dataSource: string;
  soilInfo: SoilInfo;
};

const renderLCCString = (
  t: TFunction,
  {capabilityClass, subClass}: LandCapabilityClass,
) => {
  if (!capabilityClass) {
    return t('general.not_available');
  }
  if (!subClass) {
    return capabilityClass;
  }

  return `${capabilityClass}${subClass}`;
};

export function SoilInfoDisplay({
  dataRegion,
  dataSource,
  soilInfo,
}: SoilInfoDisplayProps) {
  if (dataRegion === 'US')
    return <SoilInfoDisplayUS dataSource={dataSource} soilInfo={soilInfo} />;
  else return <SoilInfoDisplayGlobal soilInfo={soilInfo} />;
}

type SoilInfoDisplayGlobalProps = {
  soilInfo: SoilInfo;
};

type SoilInfoDisplayUSProps = {
  dataSource: string;
  soilInfo: SoilInfo;
};

function getNormalizedSoilName(soilSeriesName: string) {
  let normalizedSoilName = soilSeriesName
    .trim()
    .toLowerCase()
    .replace(/ /g, '_');

  // TODO: Fix this typo in the database instead of handling it here
  if (normalizedSoilName === 'albic_luvsiols') {
    normalizedSoilName = 'albic_luvisols';
  }

  return normalizedSoilName;
}

function getSoilSeriesDisplayText(
  soilSeries: SoilSeries,
  t: TFunction,
  i18n: i18nType,
) {
  // As of 2025-07 we only expect global (not US) soil match descriptions to come from the client-side i18n files
  const soilKey = `soil.match_info.${getNormalizedSoilName(soilSeries.name)}`;

  if (i18n.exists(soilKey)) {
    const soilSeriesTextForDisplay: SoilSeries = {
      name: i18n.exists(`${soilKey}.name`)
        ? t(`${soilKey}.name`)
        : soilSeries.name,
      description: i18n.exists(`${soilKey}.description`)
        ? t(`${soilKey}.description`)
        : soilSeries.description,
      management: i18n.exists(`${soilKey}.management`)
        ? t(`${soilKey}.management`)
        : soilSeries.management,
      fullDescriptionUrl: soilSeries.fullDescriptionUrl ?? undefined,
      taxonomySubgroup: soilSeries.taxonomySubgroup ?? undefined,
    };
    return soilSeriesTextForDisplay;
  } else {
    return soilSeries;
  }
}

function SoilInfoDisplayGlobal({soilInfo}: SoilInfoDisplayGlobalProps) {
  const {t, i18n} = useTranslation();
  const displaySoilSeries = getSoilSeriesDisplayText(
    soilInfo.soilSeries,
    t,
    i18n,
  );

  return (
    <Column space="0px">
      {displaySoilSeries?.description && (
        <>
          <TranslatedParagraph i18nKey="site.soil_id.soil_info.description_title" />
          <Text variant="body1">{displaySoilSeries.description}</Text>
          <Box height="12px" />
        </>
      )}
      {displaySoilSeries?.management && (
        <>
          <TranslatedParagraph i18nKey="site.soil_id.soil_info.management_title" />
          <Text variant="body1">{displaySoilSeries.management}</Text>
          <Box height="12px" />
        </>
      )}
      <TranslatedParagraph
        i18nKey="site.soil_id.soil_info.data_source_label"
        values={{source: t('site.soil_id.soil_info.FAO_HWSD')}}
      />
    </Column>
  );
}

function SoilInfoDisplayUS({dataSource, soilInfo}: SoilInfoDisplayUSProps) {
  const {t} = useTranslation();

  return (
    <Column space={3}>
      <Heading variant="h6" fontStyle="italic" pb="10px">
        {soilInfo.soilSeries.taxonomySubgroup}
      </Heading>
      <Text variant="body1">{soilInfo.soilSeries.description}</Text>
      {soilInfo.soilSeries.fullDescriptionUrl && (
        <ExternalLink
          label={t('site.soil_id.soil_info.series_descr_url')}
          url={soilInfo.soilSeries.fullDescriptionUrl}
        />
      )}
      {soilInfo.ecologicalSite && (
        <>
          <Box>
            <TranslatedParagraph
              i18nKey="site.soil_id.soil_info.eco_name_label"
              values={{
                name: soilInfo.ecologicalSite.name,
              }}
            />
            <TranslatedParagraph
              i18nKey="site.soil_id.soil_info.eco_id_label"
              values={{
                id: soilInfo.ecologicalSite.id,
              }}
            />
          </Box>
          <ExternalLink
            label={t('site.soil_id.soil_info.eco_descr_url')}
            url={soilInfo.ecologicalSite.url}
          />
        </>
      )}

      <Box>
        {soilInfo.landCapabilityClass && (
          <TranslatedParagraph
            i18nKey="site.soil_id.soil_info.land_class_label"
            values={{land: renderLCCString(t, soilInfo.landCapabilityClass)}}
          />
        )}
        <TranslatedParagraph
          i18nKey="site.soil_id.soil_info.data_source_label"
          values={{
            source: dataSource,
          }}
        />
      </Box>
    </Column>
  );
}
