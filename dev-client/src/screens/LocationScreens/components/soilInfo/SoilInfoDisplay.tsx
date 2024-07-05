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

import {SoilInfo} from 'terraso-client-shared/graphqlSchema/graphql';

import {TranslatedParagraph} from 'terraso-mobile-client/components/content/typography/TranslatedParagraph';
import InternalLink from 'terraso-mobile-client/components/links/InternalLink';
import {
  Box,
  Column,
  Heading,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

type SoilInfoDisplayProps = {
  dataSource: string;
  soilInfo: SoilInfo;
};

export function SoilInfoDisplay({dataSource, soilInfo}: SoilInfoDisplayProps) {
  const {t} = useTranslation();

  return (
    <Column space={3}>
      <Heading variant="h6" fontStyle="italic" pb="10px">
        {soilInfo.soilSeries.taxonomySubgroup}
      </Heading>
      <Text variant="body1">{soilInfo.soilSeries.description}</Text>
      <InternalLink
        label={t('site.soil_id.soil_info.series_descr_url')}
        url={soilInfo.soilSeries.fullDescriptionUrl}
      />
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
          <InternalLink
            label={t('site.soil_id.soil_info.eco_descr_url')}
            url={soilInfo.ecologicalSite.url}
          />
        </>
      )}
      <Box>
        <TranslatedParagraph
          i18nKey="site.soil_id.soil_info.land_class_label"
          values={{
            land: soilInfo.landCapabilityClass.capabilityClass,
          }}
        />
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
