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

import React, {useCallback, useEffect} from 'react';
import {FlatList, View} from 'react-native';

import Mapbox from '@rnmapbox/maps';

import {Site} from 'terraso-client-shared/site/siteTypes';
import {Coords} from 'terraso-client-shared/types';

import {CloseButton} from 'terraso-mobile-client/components/buttons/icons/common/CloseButton';
import {Card} from 'terraso-mobile-client/components/Card';
import {Divider} from 'terraso-mobile-client/components/Divider';
import {SiteCard} from 'terraso-mobile-client/components/SiteCard';
import {coordsToPosition} from 'terraso-mobile-client/components/StaticMapView';
import {useSitesScreenContext} from 'terraso-mobile-client/context/SitesScreenContext';
import {SiteClusterCalloutListItem} from 'terraso-mobile-client/screens/SitesScreen/components/SiteClusterCalloutListItem';
import {TemporaryLocationCallout} from 'terraso-mobile-client/screens/SitesScreen/components/TemporaryLocationCallout';
import {
  CalloutState,
  getCalloutCoords,
  getCalloutSite,
  getCalloutSites,
  noneCallout,
} from 'terraso-mobile-client/screens/SitesScreen/SitesScreenCallout';

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

  return (
    <Mapbox.MarkerView
      coordinate={coordsToPosition(coords)}
      anchor={{x: 0.5, y: 0}}
      allowOverlap>
      <View pointerEvents="box-none">
        <CalloutChild
          coords={coords}
          sites={sites}
          state={state}
          setState={setState}
        />
      </View>
    </Mapbox.MarkerView>
  );
};

type CalloutChildProps = Props & {
  coords: Coords;
};

const CalloutChild = ({coords, sites, state, setState}: CalloutChildProps) => {
  const closeCallout = useCallback(() => setState(noneCallout()), [setState]);
  const sitesScreen = useSitesScreenContext();

  // Collapse bottom sheet when showing location callout - use effect to avoid side effects during render
  useEffect(() => {
    if (state.kind === 'location') {
      sitesScreen?.collapseBottomSheet();
    }
  }, [state.kind, sitesScreen]);

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
      const creationMethod =
        state.kind === 'location' ? state.creationMethod : 'map';
      return (
        <TemporaryLocationCallout
          coords={coords}
          closeCallout={closeCallout}
          isCurrentLocation={isCurrentLocation}
          creationMethod={creationMethod}
        />
      );
  }
};
