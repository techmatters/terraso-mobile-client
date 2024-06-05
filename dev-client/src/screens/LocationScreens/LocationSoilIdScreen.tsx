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
import {ScrollView} from 'react-native-gesture-handler';

import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';

import {selectSite} from 'terraso-client-shared/selectors';
import {Coords} from 'terraso-client-shared/types';

import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {SiteRoleContextProvider} from 'terraso-mobile-client/context/SiteRoleContext';
import {useSoilIdData} from 'terraso-mobile-client/hooks/soilIdHooks';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {CreateSiteButton} from 'terraso-mobile-client/screens/LocationScreens/components/CreateSiteButton';
import {SiteDataSection} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/SiteDataSection';
import {SoilIdDescriptionSection} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/SoilIdDescriptionSection';
import {SoilIdMatchesSection} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/SoilIdMatchesSection';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useSelector} from 'terraso-mobile-client/store';

type Props = {
  siteId?: string;
  coords: Coords;
};

export const LocationSoilIdScreen = ({siteId, coords}: Props) => {
  const {t} = useTranslation();
  const site = useSelector(state =>
    siteId === undefined ? undefined : selectSite(siteId)(state),
  );
  const {status} = useSoilIdData(coords, siteId);

  return (
    <BottomSheetModalProvider>
      <ScreenScaffold
        AppBar={
          <AppBar title={site?.name ?? t('site.dashboard.default_title')} />
        }>
        <ScrollView>
          <SoilIdDescriptionSection siteId={siteId} coords={coords} />
          {status === 'ready' && (
            <SoilIdMatchesSection siteId={siteId} coords={coords} />
          )}
          {siteId ? (
            <SiteRoleContextProvider siteId={siteId}>
              <SiteDataSection siteId={siteId} />
            </SiteRoleContextProvider>
          ) : (
            <Box paddingVertical="md">
              <CreateSiteButton coords={coords} />
            </Box>
          )}
        </ScrollView>
      </ScreenScaffold>
    </BottomSheetModalProvider>
  );
};
