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

import {useSoilIdData} from 'terraso-client-shared/soilId/soilIdHooks';
import {Coords} from 'terraso-client-shared/types';

import {HelpSection} from 'terraso-mobile-client/components/content/HelpSection';
import {ScreenContentSection} from 'terraso-mobile-client/components/content/ScreenContentSection';
import {ExternalLink} from 'terraso-mobile-client/components/links/ExternalLink';
import {AlertMessageBox} from 'terraso-mobile-client/components/messages/AlertMessageBox';
import {ErrorMessageBox} from 'terraso-mobile-client/components/messages/ErrorMessageBox';
import {
  Box,
  Heading,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {InfoOverlaySheet} from 'terraso-mobile-client/components/sheets/InfoOverlaySheet';
import {InfoOverlaySheetButton} from 'terraso-mobile-client/components/sheets/InfoOverlaySheetButton';
import {
  getSortedDataBasedMatches,
  getSortedLocationBasedMatches,
} from 'terraso-mobile-client/model/soilId/soilIdRanking';
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
        <HelpSection>
          <InfoOverlaySheetButton Header={t('site.soil_id.matches.info.title')}>
            <TopSoilMatchesInfoContent isSite={isSite} />
          </InfoOverlaySheetButton>
        </HelpSection>
      </Row>
      <MatchTilesOrMessage siteId={siteId} coords={coords} />
    </ScreenContentSection>
  );
};

const MatchTilesOrMessage = ({siteId, coords}: SoilIdMatchesSectionProps) => {
  const {t} = useTranslation();

  const soilIdData = useSoilIdData(coords, siteId);
  const status = soilIdData.status;
  const isSite = !!siteId;

  switch (status) {
    case 'loading':
      return <ActivityIndicator size="small" />;
    case 'ready': {
      if (isSite) {
        return getSortedDataBasedMatches(soilIdData).map(dataMatch => (
          <InfoOverlaySheet
            key={dataMatch.soilInfo.soilSeries.name}
            Header={dataMatch.soilInfo.soilSeries.name}
            trigger={onOpen => (
              <SoilMatchTile
                soil_name={dataMatch.soilInfo.soilSeries.name}
                score={dataMatch.combinedMatch.score}
                onPress={onOpen}
              />
            )}>
            <SiteScoreInfoContent dataMatch={dataMatch} coords={coords} />
          </InfoOverlaySheet>
        ));
      } else {
        return getSortedLocationBasedMatches(soilIdData).map(locationMatch => (
          <InfoOverlaySheet
            key={locationMatch.soilInfo.soilSeries.name}
            Header={locationMatch.soilInfo.soilSeries.name}
            trigger={onOpen => (
              <SoilMatchTile
                soil_name={locationMatch.soilInfo.soilSeries.name}
                score={locationMatch.match.score}
                onPress={onOpen}
              />
            )}>
            <TempScoreInfoContent
              locationMatch={locationMatch}
              coords={coords}
            />
          </InfoOverlaySheet>
        ));
      }
    }
    case 'DATA_UNAVAILABLE':
      return (
        <AlertMessageBox title={t('site.soil_id.matches.no_map_data_title')}>
          <NoMapDataAlertMessageContent />
        </AlertMessageBox>
      );
    case 'error':
    case 'ALGORITHM_FAILURE':
    default:
      return (
        <ErrorMessageBox title={t('site.soil_id.matches.error_generic_title')}>
          <Text variant="body1" color="error.content">
            {t('site.soil_id.matches.error_generic_body')}
          </Text>
        </ErrorMessageBox>
      );
  }
};

const NoMapDataAlertMessageContent = () => {
  const {t} = useTranslation();

  return (
    <Box>
      <Text variant="body1" mb="sm">
        {t('site.soil_id.matches.no_map_data_body')}
      </Text>
      <Text variant="body1">
        {t('site.soil_id.matches.native_lands_intro')}
      </Text>
      <ExternalLink
        label={t('site.soil_id.matches.native_lands_link')}
        url={t('site.soil_id.matches.native_lands_url')}
      />
    </Box>
  );
};
