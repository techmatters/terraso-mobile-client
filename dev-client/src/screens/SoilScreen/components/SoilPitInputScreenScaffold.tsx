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

import {LabelledDepthInterval} from 'terraso-client-shared/soilId/soilIdSlice';

import {Heading} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {renderDepthInterval} from 'terraso-mobile-client/screens/SoilScreen/components/RenderValues';
import {useSelector} from 'terraso-mobile-client/store';

export type SoilPitInputScreenProps = {
  siteId: string;
  depthInterval: LabelledDepthInterval;
};

export const SoilPitInputScreenScaffold = ({
  siteId,
  depthInterval,
  children,
}: React.PropsWithChildren<SoilPitInputScreenProps>) => {
  const name = useSelector(state => state.site.sites[siteId].name);
  const {t} = useTranslation();

  return (
    <ScreenScaffold
      AppBar={
        <AppBar
          title={name}
          Content={
            <Heading px="10px" pb="8px" variant="h6" color="primary.contrast">
              {renderDepthInterval(t, depthInterval)}
            </Heading>
          }
        />
      }
      BottomNavigation={null}>
      {children}
    </ScreenScaffold>
  );
};
