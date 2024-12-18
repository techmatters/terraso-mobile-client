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

import {Coords} from 'terraso-client-shared/types';

import {useHandleMissingSiteOrProject} from 'terraso-mobile-client/components/dataRequirements/handleMissingData';
import {ScreenDataRequirements} from 'terraso-mobile-client/components/dataRequirements/ScreenDataRequirements';
import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {SiteRoleContextProvider} from 'terraso-mobile-client/context/SiteRoleContext';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {CreateSiteButton} from 'terraso-mobile-client/screens/LocationScreens/components/CreateSiteButton';
import {SiteDataSection} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/SiteDataSection';
import {SoilIdDescriptionSection} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/SoilIdDescriptionSection';
import {SoilIdMatchesSection} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/SoilIdMatchesSection';
import {SoilIdSelectionSection} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/SoilIdSelectionSection';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useSelector} from 'terraso-mobile-client/store';
import {selectSite} from 'terraso-mobile-client/store/selectors';

type Props = {
  siteId?: string;
  coords: Coords;
};

export const LocationSoilIdScreen = ({siteId, coords}: Props) => {
  const {t} = useTranslation();

  const isSite = !!siteId;
  const site = useSelector(state =>
    isSite ? selectSite(siteId)(state) : undefined,
  );

  const siteIsRequiredButMissing = isSite && !site;
  const handleMissingSite = useHandleMissingSiteOrProject();
  const requirements = [
    {
      data: siteIsRequiredButMissing ? undefined : true,
      doIfMissing: handleMissingSite,
    },
  ];

  return (
    <ScreenDataRequirements requirements={requirements}>
      {() => (
        <ScreenScaffold
          AppBar={
            <AppBar title={site?.name ?? t('site.dashboard.default_title')} />
          }>
          <ScrollView>
            {isSite ? (
              <SoilIdSelectionSection siteId={siteId} coords={coords} />
            ) : (
              <></>
            )}
            <SoilIdDescriptionSection siteId={siteId} coords={coords} />
            <SoilIdMatchesSection siteId={siteId} coords={coords} />
            {isSite ? (
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
      )}
    </ScreenDataRequirements>
  );
};
