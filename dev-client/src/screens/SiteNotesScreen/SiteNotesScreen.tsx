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
import {Button, Heading, FlatList} from 'native-base';
import {useSelector} from 'terraso-mobile-client/store';
import {useTranslation} from 'react-i18next';
import SiteNote from 'terraso-client-shared/site/siteSlice';
import {SiteNoteCard} from 'terraso-mobile-client/screens/SiteNotesScreen/components/SiteNoteCard';
import {SiteInstructionsCard} from 'terraso-mobile-client/screens/SiteNotesScreen/components/SiteInstructionsCard';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {
  Box,
  Column,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

export type SiteNote = {
  id: string;
  content: string;
  createdAt: string;
  authorFirstName: string;
  authorLastName: string;
};

export const SiteNotesScreen = ({siteId}: {siteId: string}) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const site = useSelector(state => state.site.sites[siteId]);
  const project = useSelector(state =>
    site.projectId === undefined
      ? undefined
      : state.project.projects[site.projectId],
  );

  const onAddNote = useCallback(() => {
    navigation.navigate('ADD_SITE_NOTE', {siteId: siteId});
  }, [navigation, siteId]);

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
      <FlatList
        pb={540}
        data={Object.values(site.notes)}
        keyExtractor={note => note.id}
        ListFooterComponent={<Box height="300px" />}
        renderItem={({item: note}) => <SiteNoteCard note={note} />}
      />
    </Column>
  );
};
