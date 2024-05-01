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

import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import React, {useCallback} from 'react';
import {Site} from 'terraso-client-shared/site/siteSlice';
import {useSelector} from 'terraso-mobile-client/store';
import {useTranslation} from 'react-i18next';
import {StyleSheet} from 'react-native';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {IconButton} from 'terraso-mobile-client/components/icons/IconButton';
import {StaticMapView} from 'terraso-mobile-client/components/StaticMapView';
import {Card} from 'terraso-mobile-client/components/Card';
import {
  Box,
  Row,
  Heading,
  Text,
  Badge,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

const TEMP_MODIFIED_DATE = '8/15/23';
const TEMP_MODIFIED_NAME = 'Sample Sam';

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
  const {t} = useTranslation();
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
        <Heading variant="h6" color="primary.main">
          {site.name}
        </Heading>
      }
      onPress={onCardPress}
      buttons={buttons}
      isPopover={isPopover}>
      {project && <Heading size="md">{project.name}</Heading>}
      <Text variant="subtitle2" color="text.secondary">
        {t('site.last_updated', {
          date: TEMP_MODIFIED_DATE,
          name: TEMP_MODIFIED_NAME,
        })}
      </Text>
      <Box h="16px" />
      <Row alignItems="center">
        <StaticMapView coords={site} style={styles.mapView} />
        <Box w="4" />
        {project && (
          <Badge variant="chip" startIcon={<Icon name="people-alt" />}>
            {Object.keys(project.memberships).length}
          </Badge>
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

const styles = StyleSheet.create({mapView: {height: 60, width: 60}});
