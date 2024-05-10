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
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {Coords} from 'terraso-mobile-client/model/map/mapSlice';
import {CreateSiteButton} from 'terraso-mobile-client/screens/LocationScreens/components/CreateSiteButton';
import {
  SoilIdDescriptionSection,
  SoilIdMatchesSection,
} from 'terraso-mobile-client/screens/LocationScreens/components/SoilIdSections';
import {SiteDataSection} from 'terraso-mobile-client/screens/LocationScreens/components/SiteDataSection';
import {selectSite} from 'terraso-client-shared/selectors';
import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';

type Props = {
  siteId?: string;
  coords: Coords;
};

export const LocationSoilIdScreen = ({siteId, coords}: Props) => {
  const {t} = useTranslation();
  const site = useSelector(state =>
    siteId === undefined ? undefined : selectSite(siteId)(state),
  );

  return (
    <ScreenScaffold
      AppBar={
        <AppBar title={site?.name ?? t('site.dashboard.default_title')} />
      }>
      <SoilIdDescriptionSection siteId={siteId} />
      <SoilIdMatchesSection siteId={siteId} />
      {siteId ? (
        <SiteDataSection />
      ) : (
        <Box paddingVertical="md">
          <CreateSiteButton coords={coords} />
        </Box>
      )}
    </ScreenScaffold>
  );
};
