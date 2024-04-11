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
import Mapbox from '@rnmapbox/maps';
import {Divider, FlatList} from 'native-base';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {CalloutState} from 'terraso-mobile-client/screens/HomeScreen/HomeScreenCallout';
import {coordsToPosition} from 'terraso-mobile-client/components/StaticMapView';
import {Card} from 'terraso-mobile-client/components/Card';
import {CardCloseButton} from 'terraso-mobile-client/components/CardCloseButton';
import {SiteCard} from 'terraso-mobile-client/components/SiteCard';
import {SiteClusterCalloutListItem} from 'terraso-mobile-client/screens/HomeScreen/components/SiteClusterCalloutListItem';
import {TemporarySiteCallout} from 'terraso-mobile-client/screens/HomeScreen/components/TemporarySiteCallout';

type Props = {
  sites: Record<string, Site>;
  state: CalloutState;
  setState: (state: CalloutState) => void;
};

export const SiteMapCallout = ({sites, state, setState}: Props) => {
  const closeCallout = useCallback(() => setState({kind: 'none'}), [setState]);

  if (state.kind === 'none') {
    return null;
  }

  const coords = state.kind === 'site' ? sites[state.siteId] : state.coords;

  let child: React.ComponentProps<typeof Mapbox.MarkerView>['children'];

  if (state.kind === 'site') {
    child = (
      <SiteCard
        site={sites[state.siteId]}
        buttons={<CardCloseButton onPress={closeCallout} />}
        isPopover={true}
      />
    );
  } else if (state.kind === 'site_cluster') {
    child = (
      <Card
        width="270px"
        buttons={<CardCloseButton onPress={closeCallout} />}
        isPopover={true}>
        <FlatList
          data={state.siteIds}
          keyExtractor={id => id}
          renderItem={({item: id}) => (
            <SiteClusterCalloutListItem site={sites[id]} setState={setState} />
          )}
          ItemSeparatorComponent={() => <Divider my="10px" />}
        />
      </Card>
    );
  } else if (state.kind === 'location') {
    child = (
      <TemporarySiteCallout coords={coords} closeCallout={closeCallout} />
    );
  } else {
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
