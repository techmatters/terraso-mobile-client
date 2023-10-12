import React, {useCallback} from 'react';
import Mapbox from '@rnmapbox/maps';
import {Divider, FlatList} from 'native-base';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {CalloutState} from '../../screens/HomeScreen';
import {coordsToPosition} from '../common/Map';
import {Card, CardCloseButton} from '../common/Card';
import {SiteCard} from '../sites/SiteCard';
import SiteClusterCalloutListItem from './SiteClusterCalloutListItem';
import TemporarySiteCallout from './TemporarySiteCallout';

type SiteMapCalloutProps = {
  sites: Record<string, Site>;
  state: CalloutState;
  setState: (state: CalloutState) => void;
};

const SiteMapCallout = ({sites, state, setState}: SiteMapCalloutProps) => {
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
      />
    );
  } else if (state.kind === 'site_cluster') {
    child = (
      <Card width="270px" buttons={<CardCloseButton onPress={closeCallout} />}>
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

export default SiteMapCallout;
