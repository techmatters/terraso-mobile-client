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

import {useTranslation} from 'react-i18next';
import {ScrollView} from 'react-native-gesture-handler';

import {SoilMatch} from 'terraso-client-shared/graphqlSchema/graphql';
import {Coords} from 'terraso-client-shared/types';

import {ScreenContentSection} from 'terraso-mobile-client/components/content/ScreenContentSection';
import {useNavToBottomTabsAndShowSyncError} from 'terraso-mobile-client/components/dataRequirements/handleMissingData';
import {
  ScreenDataRequirements,
  useMemoizedRequirements,
} from 'terraso-mobile-client/components/dataRequirements/ScreenDataRequirements';
import {RestrictByFlag} from 'terraso-mobile-client/components/restrictions/RestrictByFlag';
import {SiteRoleContextProvider} from 'terraso-mobile-client/context/SiteRoleContext';
import {DataRegion} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {RateSoilMatchFabWithSheet} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/RateSoilMatchFormSheet';
import {SiteScoreInfoContent} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/SiteScoreInfoContent';
import {SoilNameHeading} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/SoilNameHeading';
import {TempScoreInfoContent} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/TempScoreInfoContent';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useSelector} from 'terraso-mobile-client/store';
import {selectSite} from 'terraso-mobile-client/store/selectors';

type ScreenPropsForTempLocation = {
  coords: Coords;
  soilMatch: SoilMatch;
  dataRegion: DataRegion;
};
type ScreenPropsForSite = {siteId: string} & ScreenPropsForTempLocation;

export const TemporaryLocationSoilMatchInfoScreen = ({
  coords,
  soilMatch,
  dataRegion,
}: ScreenPropsForTempLocation) => {
  const {t} = useTranslation();

  return (
    <ScreenScaffold
      AppBar={<AppBar title={t('site.dashboard.default_title')} />}>
      <ScrollView>
        <ScreenContentSection>
          <SoilNameHeading
            soilName={soilMatch.soilInfo.soilSeries.name}
            dataRegion={dataRegion}
          />
          <TempScoreInfoContent
            coords={coords}
            dataRegion={dataRegion}
            tempLocationMatch={soilMatch}
          />
        </ScreenContentSection>
      </ScrollView>
    </ScreenScaffold>
  );
};

export const SiteSoilMatchInfoScreen = ({
  siteId,
  coords,
  soilMatch,
  dataRegion,
}: ScreenPropsForSite) => {
  const site = useSelector(state => selectSite(siteId)(state)) ?? undefined;

  const handleMissingSite = useNavToBottomTabsAndShowSyncError();
  const requirements = useMemoizedRequirements([
    {data: site, doIfMissing: handleMissingSite},
  ]);

  return (
    <ScreenDataRequirements requirements={requirements}>
      {() => (
        <ScreenScaffold AppBar={<AppBar title={site.name} />}>
          <ScrollView>
            <ScreenContentSection>
              <SoilNameHeading
                soilName={soilMatch.soilInfo.soilSeries.name}
                dataRegion={dataRegion}
              />
              <SiteRoleContextProvider siteId={siteId}>
                <SiteScoreInfoContent
                  siteId={siteId}
                  coords={coords}
                  dataRegion={dataRegion}
                  siteMatch={soilMatch}
                />
              </SiteRoleContextProvider>
            </ScreenContentSection>
          </ScrollView>
          <RestrictByFlag flag="FF_select_soil">
            <RateSoilMatchFabWithSheet
              siteId={siteId}
              siteName={site.name}
              soilMatch={soilMatch}
            />
          </RestrictByFlag>
        </ScreenScaffold>
      )}
    </ScreenDataRequirements>
  );
};
