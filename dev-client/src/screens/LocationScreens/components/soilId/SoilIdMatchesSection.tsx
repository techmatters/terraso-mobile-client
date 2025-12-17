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

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import {SoilMatch} from 'terraso-client-shared/graphqlSchema/graphql';
import {Coords} from 'terraso-client-shared/types';

import {InfoButton} from 'terraso-mobile-client/components/buttons/icons/common/InfoButton';
import {HelpContentSpacer} from 'terraso-mobile-client/components/content/HelpContentSpacer';
import {ScreenContentSection} from 'terraso-mobile-client/components/content/ScreenContentSection';
import {TranslatedHeading} from 'terraso-mobile-client/components/content/typography/TranslatedHeading';
import {
  Box,
  Column,
  Heading,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictByConnectivity} from 'terraso-mobile-client/components/restrictions/RestrictByConnectivity';
import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {
  SoilIdOutput,
  useSoilIdOutput,
} from 'terraso-mobile-client/hooks/soilIdHooks';
import {SoilData} from 'terraso-mobile-client/model/soilData/soilDataSlice';
import {getSortedMatches} from 'terraso-mobile-client/model/soilIdMatch/soilIdRanking';
import {
  useSelectedSoil,
  useUserRatings,
} from 'terraso-mobile-client/model/soilMetadata/soilMetadataHooks';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {NoMapDataWarningAlert} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/alertBoxes/NoMapDataWarningAlert';
import {OfflineAlert} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/alertBoxes/OfflineAlert';
import {SoilMatchesErrorAlert} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/alertBoxes/SoilMatchesErrorAlert';
import {SoilMatchTile} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/SoilMatchTile';
import {getMatchListTileVariant} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/soilMatchTileVariants';
import {TopSoilMatchesInfoContent} from 'terraso-mobile-client/screens/LocationScreens/components/TopSoilMatchesInfoContent';
import {useSelector} from 'terraso-mobile-client/store';
import {selectSoilData} from 'terraso-mobile-client/store/selectors';

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

const isEmptySoilData = (soilData: SoilData): boolean => {
  if (!soilData) return true;

  // Check if surface crack data has been set
  const hasCracks = !!soilData.surfaceCracksSelect;

  // Check if any soil properties (texture, color, rock fragment, etc) have been entered
  // These are stored in depth dependent data
  const hasDepthIntervals =
    Array.isArray(soilData.depthDependentData) &&
    soilData.depthDependentData.length > 0 &&
    Object.values(soilData.depthDependentData).some(
      depthData => depthData !== null && depthData !== undefined,
    );

  return !hasCracks && !hasDepthIntervals;
};

const MatchTiles = ({siteId, coords, soilIdOutput}: MatchTilesProps) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const isOffline = useIsOffline();
  const status = soilIdOutput.status;
  const dataRegion = soilIdOutput.dataRegion;
  const isSite = !!siteId;

  // Check if soil data exists for the site
  const soilData = useSelector(selectSoilData(siteId || ''));
  const showImproveMessage = isSite && isEmptySoilData(soilData);

  const onMatchTilePress = useCallback(
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

  // Ratings are only relevant for sites
  const userRatings = useUserRatings(siteId);
  const selectedSoilId = useSelectedSoil(siteId);

  switch (status) {
    case 'loading':
      return isOffline ? null : <ActivityIndicator size="small" />;
    case 'ready': {
      const sortedMatches = getSortedMatches(soilIdOutput.matches);
      return (
        <>
          {showImproveMessage && (
            <Box
              backgroundColor="primary.50"
              px="12px"
              py="12px"
              borderRadius="8px"
              mb="12px">
              <Column space="8px">
                <Row alignItems="center" space="8px">
                  <MaterialCommunityIcons
                    name="information-outline"
                    size={20}
                    color="black"
                  />
                  <Text bold fontSize="16px">
                    {t('site.soil_id.matches.improve_hint')}
                  </Text>
                </Row>
                <Box pl="24px" pr="24px" mb="8px">
                  <Text>{t('site.soil_id.matches.improve_description')}</Text>
                </Box>
              </Column>
            </Box>
          )}
          {sortedMatches.map(soilMatch => (
            <SoilMatchTile
              key={soilMatch.soilInfo.soilSeries.name}
              soilName={soilMatch.soilInfo.soilSeries.name}
              dataRegion={dataRegion}
              score={
                soilMatch.combinedMatch?.score ?? soilMatch.locationMatch.score
              }
              onPress={() => onMatchTilePress(soilMatch)}
              variant={getMatchListTileVariant(
                soilMatch,
                userRatings,
                selectedSoilId,
              )}
            />
          ))}
        </>
      );
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
