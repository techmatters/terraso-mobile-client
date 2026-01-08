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
  Box,
  Heading,
  Row,
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
import {InfoAlertNoSoilData} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/alertBoxes/InfoAlertNoSoilData';
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

/**
 * Checks if an object has any non-null values, excluding specified keys.
 *
 * IMPORTANT: This uses a dynamic approach that automatically includes new fields
 * added to SoilData or DepthDependentSoilData types. The trade-off is:
 * - Pro: New user data fields are automatically checked without code changes
 * - Con: If new system/config fields are added to these types, they must be
 *   added to the exclusion lists below, otherwise they may cause false positives
 */
const hasAnyNonNullValue = (obj: any, excludedKeys: string[]): boolean => {
  return Object.entries(obj).some(
    ([key, value]) => !excludedKeys.includes(key) && value != null,
  );
};

// System/config fields in SoilData that should not be considered user data
const SOIL_DATA_EXCLUDED_KEYS = [
  'site', // Reference to parent site
  'depthIntervalPreset', // System config (always has a value)
  'depthIntervals', // Interval configuration, not soil data
  'depthDependentData', // Handled separately with recursive check
];

// System/config fields in DepthDependentSoilData that should not be considered user data
const DEPTH_DATA_EXCLUDED_KEYS = [
  'site', // Reference to parent site
  'depthInterval', // Defines the interval bounds, not user-entered soil data
];

const isEmptySoilData = (soilData: SoilData): boolean => {
  if (!soilData) return true;

  // Check if any top-level soil data fields have been set
  if (hasAnyNonNullValue(soilData, SOIL_DATA_EXCLUDED_KEYS)) {
    return false;
  }

  // Check if any depth-dependent data (texture, color, rock fragment, etc) has been entered
  // Note: depthDependentData entries exist as objects when intervals are added,
  // but may have all user data fields as null - we need to check inside each entry
  if (
    Array.isArray(soilData.depthDependentData) &&
    soilData.depthDependentData.some(depthData =>
      hasAnyNonNullValue(depthData, DEPTH_DATA_EXCLUDED_KEYS),
    )
  ) {
    return false;
  }

  return true;
};

const MatchTiles = ({siteId, coords, soilIdOutput}: MatchTilesProps) => {
  const navigation = useNavigation();
  const isOffline = useIsOffline();
  const status = soilIdOutput.status;
  const dataRegion = soilIdOutput.dataRegion;
  const isSite = !!siteId;

  // Check if soil data exists for the site
  const soilData = useSelector(selectSoilData(siteId ?? ''));
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
            <Box mb="12px">
              <InfoAlertNoSoilData />
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
