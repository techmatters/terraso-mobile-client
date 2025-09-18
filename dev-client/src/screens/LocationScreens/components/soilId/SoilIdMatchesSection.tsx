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
import {useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {ActivityIndicator} from 'react-native-paper';

import {SoilMatch} from 'terraso-client-shared/graphqlSchema/graphql';
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
import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {
  SoilIdOutput,
  useSoilIdOutput,
} from 'terraso-mobile-client/hooks/soilIdHooks';
import {getSortedMatches} from 'terraso-mobile-client/model/soilIdMatch/soilIdRanking';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {NoMapDataWarningAlert} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/alertBoxes/NoMapDataWarningAlert';
import {OfflineAlert} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/alertBoxes/OfflineAlert';
import {SoilMatchesErrorAlert} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/alertBoxes/SoilMatchesErrorAlert';
import {SoilMatchCard} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/SoilMatchCard';
import {TopSoilMatchesInfoContent} from 'terraso-mobile-client/screens/LocationScreens/components/TopSoilMatchesInfoContent';

type SoilIdMatchesSectionProps = {siteId?: string; coords: Coords};

export const SoilIdMatchesSection = ({
  siteId,
  coords,
}: SoilIdMatchesSectionProps) => {
  const {t} = useTranslation();

  const soilIdInput = siteId ? {siteId} : {coords};
  const soilIdOutput = useSoilIdOutput(soilIdInput);
  const dataRegion = soilIdOutput.dataRegion;
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
          <TopSoilMatchesInfoContent isSite={isSite} dataRegion={dataRegion} />
        </InfoButton>
      </Row>
      <RestrictByConnectivity offline={true}>
        <OfflineAlert message={t('site.soil_id.matches.offline')} />
      </RestrictByConnectivity>
      <MatchTiles siteId={siteId} coords={coords} soilIdOutput={soilIdOutput} />
    </ScreenContentSection>
  );
};

type MatchTilesProps = SoilIdMatchesSectionProps & {soilIdOutput: SoilIdOutput};

const MatchTiles = ({siteId, coords, soilIdOutput}: MatchTilesProps) => {
  const navigation = useNavigation();
  const isOffline = useIsOffline();
  const status = soilIdOutput.status;
  const dataRegion = soilIdOutput.dataRegion;
  const isSite = !!siteId;

  const onMatchCardPress = useCallback(
    (soilMatch: SoilMatch) => {
      if (isSite) {
        navigation.navigate('SITE_SOIL_MATCH_INFO', {
          siteId,
          coords,
          soilMatch,
          dataRegion,
        });
      } else {
        navigation.navigate('TEMP_LOCATION_SOIL_MATCH_INFO', {
          coords,
          soilMatch,
          dataRegion,
        });
      }
    },
    [siteId, isSite, coords, dataRegion, navigation],
  );

  switch (status) {
    case 'loading':
      return isOffline ? <></> : <ActivityIndicator size="small" />;
    case 'ready': {
      return getSortedMatches(soilIdOutput.matches).map(soilMatch => (
        <SoilMatchCard
          key={soilMatch.soilInfo.soilSeries.name}
          soilName={soilMatch.soilInfo.soilSeries.name}
          dataRegion={dataRegion}
          score={
            soilMatch.combinedMatch?.score ?? soilMatch.locationMatch.score
          }
          onPress={() => onMatchCardPress(soilMatch)}
        />
      ));
    }
    case 'DATA_UNAVAILABLE':
      return <NoMapDataWarningAlert />;
    case 'error':
    case 'ALGORITHM_FAILURE':
    case 'TIMEOUT':
    default:
      return <SoilMatchesErrorAlert />;
  }
};
