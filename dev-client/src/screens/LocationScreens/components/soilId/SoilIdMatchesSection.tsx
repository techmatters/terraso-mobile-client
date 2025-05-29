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
import {ActivityIndicator} from 'react-native-paper';

import {Coords} from 'terraso-client-shared/types';

import {InfoButton} from 'terraso-mobile-client/components/buttons/icons/common/InfoButton';
import {HelpContentSpacer} from 'terraso-mobile-client/components/content/HelpContentSpacer';
import {ScreenContentSection} from 'terraso-mobile-client/components/content/ScreenContentSection';
import {TranslatedHeading} from 'terraso-mobile-client/components/content/typography/TranslatedHeading';
import {
  Heading,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictByConnectivity} from 'terraso-mobile-client/components/restrictions/RestrictByConnectivity';
import {InfoSheet} from 'terraso-mobile-client/components/sheets/InfoSheet';
import {SiteRoleContextProvider} from 'terraso-mobile-client/context/SiteRoleContext';
import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {useSoilIdOutput} from 'terraso-mobile-client/hooks/soilIdHooks';
import {
  SoilMatchForLocationOnly,
  SoilMatchForLocationWithData,
} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';
import {
  getSortedMatchesForLocation,
  getSortedMatchesWithData,
} from 'terraso-mobile-client/model/soilIdMatch/soilIdRanking';
import {NoMapDataAlertMessageBox} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/messageBoxes/NoMapDataAlertMessageBox';
import {OfflineMessageBox} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/messageBoxes/OfflineMessageBox';
import {SoilMatchesErrorMessageBox} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/messageBoxes/SoilMatchesErrorMessageBox';
import {SoilMatchTile} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/SoilMatchTile';
import {SiteScoreInfoContent} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/SiteScoreInfoContent';
import {TempScoreInfoContent} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/TempScoreInfoContent';
import {TopSoilMatchesInfoContent} from 'terraso-mobile-client/screens/LocationScreens/components/TopSoilMatchesInfoContent';

type SoilIdMatchesSectionProps = {siteId?: string; coords: Coords};

export const SoilIdMatchesSection = ({
  siteId,
  coords,
}: SoilIdMatchesSectionProps) => {
  const {t} = useTranslation();
  const isSite = !!siteId;

  return (
    <ScreenContentSection backgroundColor="grey.200">
      <Row alignItems="center" pb="12px">
        <Heading variant="h6">{t('site.soil_id.matches.title')}</Heading>
        <HelpContentSpacer />
        <InfoButton
          sheetHeading={
            <TranslatedHeading i18nKey="site.soil_id.matches.info.title" />
          }>
          <TopSoilMatchesInfoContent isSite={isSite} />
        </InfoButton>
      </Row>
      <RestrictByConnectivity offline={true}>
        <OfflineMessageBox message={t('site.soil_id.matches.offline')} />
      </RestrictByConnectivity>
      <MatchTiles siteId={siteId} coords={coords} />
    </ScreenContentSection>
  );
};

const MatchTiles = ({siteId, coords}: SoilIdMatchesSectionProps) => {
  const isOffline = useIsOffline();
  const soilIdOutput = useSoilIdOutput(coords, siteId);
  const status = soilIdOutput.status;
  const isSite = !!siteId;

  switch (status) {
    case 'loading':
      return isOffline ? <></> : <ActivityIndicator size="small" />;
    case 'ready': {
      if (isSite && soilIdOutput.withData /* TODO-cknipe: Redundant? */) {
        return getSortedMatchesWithData(
          soilIdOutput.matches as SoilMatchForLocationWithData[],
        ).map(dataMatch => (
          <InfoSheet
            key={dataMatch.soilInfo.soilSeries.name}
            heading={
              <TranslatedHeading i18nKey={dataMatch.soilInfo.soilSeries.name} />
            }
            trigger={onOpen => (
              <SoilMatchTile
                soilName={dataMatch.soilInfo.soilSeries.name}
                score={dataMatch.combinedMatch.score}
                onPress={onOpen}
              />
            )}>
            <SiteRoleContextProvider siteId={siteId}>
              <SiteScoreInfoContent
                dataMatch={dataMatch}
                siteId={siteId}
                coords={coords}
              />
            </SiteRoleContextProvider>
          </InfoSheet>
        ));
      } else {
        return getSortedMatchesForLocation(
          soilIdOutput.matches as SoilMatchForLocationOnly[],
        ).map(locationMatch => (
          <InfoSheet
            key={locationMatch.soilInfo.soilSeries.name}
            heading={
              <Heading variant="h4">
                {locationMatch.soilInfo.soilSeries.name}
              </Heading>
            }
            trigger={onOpen => (
              <SoilMatchTile
                soilName={locationMatch.soilInfo.soilSeries.name}
                score={locationMatch.locationMatch.score}
                onPress={onOpen}
              />
            )}>
            <TempScoreInfoContent
              locationMatch={locationMatch}
              coords={coords}
            />
          </InfoSheet>
        ));
      }
    }
    case 'DATA_UNAVAILABLE':
      return <NoMapDataAlertMessageBox />;
    case 'error':
    case 'ALGORITHM_FAILURE':
    default:
      return <SoilMatchesErrorMessageBox />;
  }
};
