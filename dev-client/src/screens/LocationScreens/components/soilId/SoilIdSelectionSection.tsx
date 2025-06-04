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

import {Coords} from 'terraso-client-shared/types';

import {ScreenContentSection} from 'terraso-mobile-client/components/content/ScreenContentSection';
import {TranslatedHeading} from 'terraso-mobile-client/components/content/typography/TranslatedHeading';
import {InfoSheet} from 'terraso-mobile-client/components/sheets/InfoSheet';
import {SiteRoleContextProvider} from 'terraso-mobile-client/context/SiteRoleContext';
import {useSoilIdOutput} from 'terraso-mobile-client/hooks/soilIdHooks';
import {SoilMatchForSite} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';
import {findSelectedMatch} from 'terraso-mobile-client/model/soilMetadata/soilMetadataFunctions';
import {useSoilIdSelection} from 'terraso-mobile-client/model/soilMetadata/soilMetadataHooks';
import {SoilMatchTile} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/SoilMatchTile';
import {SiteScoreInfoContent} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/SiteScoreInfoContent';

type SoilIdSelectionSectionProps = {siteId: string; coords: Coords};

export const SoilIdSelectionSection = ({
  siteId,
  coords,
}: SoilIdSelectionSectionProps) => {
  const soilIdOutput = useSoilIdOutput(coords, siteId);
  const {selectedSoilId} = useSoilIdSelection(siteId);
  const selectedSoilMatch = findSelectedMatch(
    soilIdOutput.matches as SoilMatchForSite[],
    selectedSoilId,
  );

  if (!selectedSoilMatch) {
    return <></>;
  }

  return (
    <ScreenContentSection backgroundColor="grey.200">
      <InfoSheet
        heading={
          <TranslatedHeading
            i18nKey={selectedSoilMatch.soilInfo.soilSeries.name}
          />
        }
        trigger={onOpen => (
          <SoilMatchTile
            soilName={selectedSoilMatch.soilInfo.soilSeries.name}
            score={
              selectedSoilMatch.combinedMatch?.score ??
              selectedSoilMatch.locationMatch.score
            }
            isSelected={true}
            onPress={onOpen}
          />
        )}>
        <SiteRoleContextProvider siteId={siteId}>
          <SiteScoreInfoContent
            siteId={siteId}
            coords={coords}
            dataRegion={soilIdOutput.dataRegion}
            siteMatch={selectedSoilMatch}
          />
        </SiteRoleContextProvider>
      </InfoSheet>
    </ScreenContentSection>
  );
};
