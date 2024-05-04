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

import {useSelector} from 'terraso-mobile-client/store';
import {
  Heading,
  Box,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';

// TODO-cknipe: Move to general component
export const SoilIdMatchesSection = () => {
  const {t} = useTranslation();

  return (
    <Box backgroundColor="grey.200">
      <Heading variant="h6">{t('site.soil_id.matches.title')}</Heading>
    </Box>
  );
};

// TODO-cknipe: Move to general component
export const SiteDataSection = () => {
  const {t} = useTranslation();

  return (
    <>
      <Heading variant="h4">{t('site.soil_id.site_data.title')}</Heading>
      <Text variant="body1">{t('site.soil_id.site_data.description')}</Text>
    </>
  );
};

type Props = {siteId?: string};

export const LocationSoilIdScreen = ({siteId}: Props) => {
  const {t} = useTranslation();
  const site = useSelector(state =>
    siteId === undefined ? undefined : state.site.sites[siteId],
  );

  return (
    <ScreenScaffold
      AppBar={
        <AppBar title={site?.name ?? t('site.dashboard.default_title')} />
      }>
      <Heading variant="h4">{t('site.soil_id.title')}</Heading>
      <Text variant="body1">
        {siteId
          ? t('site.soil_id.description.site')
          : t('site.soil_id.description.temp_location')}
      </Text>

      <SoilIdMatchesSection />

      {siteId && <SiteDataSection />}
    </ScreenScaffold>
  );
};
