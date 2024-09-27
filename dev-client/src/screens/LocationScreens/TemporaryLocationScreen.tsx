/*
 * Copyright © 2023 Technology Matters
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

import {Coords} from 'terraso-client-shared/types';

import {useSoilIdData} from 'terraso-mobile-client/model/soilId/soilIdHooks';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {LocationDashboardContent} from 'terraso-mobile-client/screens/LocationScreens/LocationDashboardContent';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';

type Props = {coords: Coords; elevation?: number};

export const TemporaryLocationScreen = (props: Props) => {
  const {t} = useTranslation();
  const coords = props.coords;
  const elevation = 'elevation' in props ? props.elevation : undefined;

  useSoilIdData(coords);

  return (
    <ScreenScaffold
      AppBar={<AppBar title={t('site.dashboard.default_title')} />}>
      <LocationDashboardContent coords={coords} elevation={elevation} />
    </ScreenScaffold>
  );
};
