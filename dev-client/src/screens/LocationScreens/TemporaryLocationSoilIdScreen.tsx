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

import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {CreateSiteButton} from 'terraso-mobile-client/screens/LocationScreens/components/CreateSiteButton';
import {SoilIdDescriptionSection} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/SoilIdDescriptionSection';
import {SoilIdMatchesSection} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/SoilIdMatchesSection';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';

type TempLocationProps = {
  coords: Coords;
};

export const TemporaryLocationSoilIdScreen = ({coords}: TempLocationProps) => {
  const {t} = useTranslation();

  return (
    <ScreenScaffold
      AppBar={<AppBar title={t('site.dashboard.default_title')} />}>
      <ScrollView>
        <SoilIdDescriptionSection coords={coords} />
        <SoilIdMatchesSection coords={coords} />
        <Box paddingVertical="md">
          <CreateSiteButton coords={coords} />
        </Box>
      </ScrollView>
    </ScreenScaffold>
  );
};
