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

import {useCallback} from 'react';
import {Pressable} from 'react-native';

import {Site} from 'terraso-client-shared/site/siteSlice';

import {
  Column,
  Heading,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {
  CalloutState,
  siteCallout,
} from 'terraso-mobile-client/screens/HomeScreen/HomeScreenCallout';
import {useSelector} from 'terraso-mobile-client/store';

type SiteClusterCalloutListItemProps = {
  site: Site;
  setState: (state: CalloutState) => void;
};

export const SiteClusterCalloutListItem = ({
  site,
  setState,
}: SiteClusterCalloutListItemProps) => {
  const project = useSelector(state =>
    site.projectId === undefined
      ? undefined
      : state.project.projects[site.projectId],
  );
  const onPress = useCallback(() => {
    setState(siteCallout(site.id));
  }, [site.id, setState]);

  return (
    <Pressable onPress={onPress}>
      <Column my="10px">
        <Heading variant="h6" color="primary.main">
          {site.name}
        </Heading>
        {project && <Text variant="body1">{project.name}</Text>}
      </Column>
    </Pressable>
  );
};
