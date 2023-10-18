import React, {useCallback} from 'react';
import Mapbox from '@rnmapbox/maps';
import {Divider, FlatList} from 'native-base';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {CalloutState} from 'terraso-mobile-client/screens/HomeScreen';
import {coordsToPosition} from 'terraso-mobile-client/components/common/Map';
import {
  Card,
  CardCloseButton,
} from 'terraso-mobile-client/components/common/Card';
import {SiteCard} from 'terraso-mobile-client/components/sites/SiteCard';
import {SiteClusterCalloutListItem} from 'terraso-mobile-client/components/home/SiteClusterCalloutListItem';
import {TemporarySiteCallout} from 'terraso-mobile-client/components/home/TemporarySiteCallout';

type SiteMapCalloutProps = {
  sites: Record<string, Site>;
  state: CalloutState;
  setState: (state: CalloutState) => void;
};

export const SiteMapCallout = ({
  sites,
  state,
  setState,
}: SiteMapCalloutProps) => {
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
