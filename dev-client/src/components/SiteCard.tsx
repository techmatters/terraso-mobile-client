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
import {StyleSheet, ViewStyle} from 'react-native';

import {Site} from 'terraso-client-shared/site/siteSlice';

import {Card} from 'terraso-mobile-client/components/Card';
import {IconButton} from 'terraso-mobile-client/components/icons/IconButton';
import {
  Box,
  Heading,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {PeopleBadge} from 'terraso-mobile-client/components/PeopleBadge';
import {StaticMapView} from 'terraso-mobile-client/components/StaticMapView';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {useSelector} from 'terraso-mobile-client/store';

type Props = {
  site: Site;
  onShowSiteOnMap?: (site: Site) => void;
  buttons?: React.ReactNode;
  isPopover?: boolean;
};

export const SiteCard = ({
  site,
  onShowSiteOnMap,
  buttons,
  isPopover,
}: Props) => {
  const navigation = useNavigation();
  const project = useSelector(state =>
    site.projectId === undefined
      ? undefined
      : state.project.projects[site.projectId],
  );

  const onCardPress = useCallback(
    () => navigation.navigate('LOCATION_DASHBOARD', {siteId: site.id}),
    [navigation, site.id],
  );

  return (
    <Card
      Header={
        <Heading
          variant="h6"
          color="primary.main"
          flex={isPopover ? 1 : undefined}>
          {site.name}
        </Heading>
      }
      pressableStyle={pressableStyles(isPopover)}
      onPress={onCardPress}
      buttons={buttons}
      isPopover={isPopover}>
      {project && <Text variant="body1">{project.name}</Text>}
      <Row alignItems="center" pt="md" justifyContent="space-between">
        <StaticMapView coords={site} style={styles.mapView} />
        {project && (
          <PeopleBadge count={Object.keys(project.memberships).length} />
        )}
        <Box flexGrow={1} />
        {onShowSiteOnMap && (
          <IconButton
            name="location-on"
            variant="outline"
            rounded="full"
            borderColor="secondary.main"
            _icon={{
              color: 'secondary.main',
            }}
            onPress={() => onShowSiteOnMap(site)}
          />
        )}
      </Row>
    </Card>
  );
};

const pressableStyles = (isPopover: Boolean = false): ViewStyle => {
  return {
    minWidth: isPopover ? '90%' : undefined,
    maxWidth: isPopover ? '90%' : undefined,
  };
};

const styles = StyleSheet.create({
  mapView: {height: 60, width: 60, marginRight: 10},
});
