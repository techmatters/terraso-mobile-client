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

import {Box, Button, Column, Heading, Row, FlatList} from 'native-base';
import {useSelector} from 'terraso-mobile-client/store';
import {useTranslation} from 'react-i18next';
import SiteNote from 'terraso-client-shared/site/siteSlice';
import {SiteNoteCard} from 'terraso-mobile-client/screens/SiteNotesScreen/components/SiteNoteCard';
import {SiteInstructionsCard} from 'terraso-mobile-client/screens/SiteNotesScreen/components/SiteInstructionsCard';
import {
  LocationDashboardTabNavigatorScreenProps,
  LocationDashboardTabNavigatorScreens,
  RootNavigatorScreens,
} from 'terraso-mobile-client/navigation/types';
import {useLocationDataContext} from 'terraso-mobile-client/navigation/hooks/useLocationDataContext';

export type SiteNote = {
  id: string;
  content: string;
  createdAt: string;
  authorFirstName: string;
  authorLastName: string;
};

type Props =
  LocationDashboardTabNavigatorScreenProps<LocationDashboardTabNavigatorScreens.NOTES>;

export const SiteNotesScreen = ({navigation}: Props) => {
  const locationData = useLocationDataContext();

  const {t} = useTranslation();
  const site = useSelector(state =>
    'siteId' in locationData
      ? state.site.sites[locationData.siteId]
      : undefined,
  );

  const project = useSelector(state =>
    site?.projectId ? state.project.projects[site.projectId] : undefined,
  );

  const onAddNote = () => {
    if ('siteId' in locationData) {
      navigation.navigate(RootNavigatorScreens.ADD_SITE_NOTE, {
        siteId: locationData.siteId,
      });
    }
  };

  return (
    <Column>
      <Row backgroundColor="background.default" px="16px" py="12px">
        <Heading variant="h6">{t('site.notes.title')}</Heading>
      </Row>
      <Box height="16px" />
      {project?.siteInstructions && (
        <SiteInstructionsCard siteInstructions={project?.siteInstructions} />
      )}
      <Box pl={4} pb={4} alignItems="flex-start">
        <Button
          size="lg"
          backgroundColor="primary.dark"
          shadow={5}
          onPress={onAddNote}
          _text={{textTransform: 'uppercase'}}>
          {t('site.notes.add_note_label')}
        </Button>
      </Box>
      {site?.notes ? (
        <FlatList
          pb={540}
          data={Object.values(site.notes)}
          keyExtractor={note => note.id}
          ListFooterComponent={<Box height="300px" />}
          renderItem={({item: note}) => <SiteNoteCard note={note} />}
        />
      ) : null}
    </Column>
  );
};
