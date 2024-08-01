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

import React, {useCallback} from 'react';
import {Divider} from 'react-native-paper';

import Mapbox from '@rnmapbox/maps';
import {FlatList} from 'native-base';

import {Site} from 'terraso-client-shared/site/siteSlice';
import {Coords} from 'terraso-client-shared/types';

import {CloseButton} from 'terraso-mobile-client/components/buttons/CloseButton';
import {Card} from 'terraso-mobile-client/components/Card';
import {SiteCard} from 'terraso-mobile-client/components/SiteCard';
import {coordsToPosition} from 'terraso-mobile-client/components/StaticMapView';
import {useHomeScreenContext} from 'terraso-mobile-client/context/HomeScreenContext';
import {SiteClusterCalloutListItem} from 'terraso-mobile-client/screens/HomeScreen/components/SiteClusterCalloutListItem';
import {TemporaryLocationCallout} from 'terraso-mobile-client/screens/HomeScreen/components/TemporaryLocationCallout';
import {
  CalloutState,
  getCalloutCoords,
  getCalloutSite,
  getCalloutSites,
  noneCallout,
} from 'terraso-mobile-client/screens/HomeScreen/HomeScreenCallout';

type Props = {
  sites: Record<string, Site>;
  state: CalloutState;
  setState: (state: CalloutState) => void;
};

export const SiteMapCallout = ({sites, state, setState}: Props) => {
  const coords = getCalloutCoords(state, sites);
  if (!coords) {
    return null;
  }

  let child = CalloutChild(coords, {sites, state, setState});
  if (!child) {
    return null;
  }

  return (
    <Mapbox.MarkerView
      coordinate={coordsToPosition(coords)}
      anchor={{x: 0.5, y: 0}}
      allowOverlap>
      {child}
    </Mapbox.MarkerView>
  );
};

const CalloutChild = (coords: Coords, {sites, state, setState}: Props) => {
  const closeCallout = useCallback(() => setState(noneCallout()), [setState]);
  const homeScreen = useHomeScreenContext();

  switch (state.kind) {
    case 'site':
      const site = getCalloutSite(state, sites);
      if (!site) {
        return null;
      }

      return (
        <SiteCard
          site={site}
          buttons={<CloseButton onPress={closeCallout} />}
          isPopover={true}
        />
      );
    case 'site_cluster':
      const clusterSites = getCalloutSites(state, sites);
      if (!clusterSites) {
        return null;
      }

      return (
        <Card
          width="350px"
          buttons={<CloseButton onPress={closeCallout} />}
          isPopover={true}>
          <FlatList
            data={Object.keys(clusterSites)}
            keyExtractor={id => id}
            renderItem={({item: id}) => (
              <SiteClusterCalloutListItem
                site={clusterSites[id]}
                setState={setState}
              />
            )}
            ItemSeparatorComponent={() => <Divider />}
          />
        </Card>
      );
    default:
      const isCurrentLocation =
        state.kind === 'location' ? state.isCurrentLocation : false;
      homeScreen?.collapseBottomSheet();
      return (
        <TemporaryLocationCallout
          coords={coords}
          closeCallout={closeCallout}
          isCurrentLocation={isCurrentLocation}
        />
      );
  }
};
