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
import {useTranslation} from 'react-i18next';

import {Spacer} from 'native-base';

import {SiteNote} from 'terraso-client-shared/site/siteTypes';

import {Card} from 'terraso-mobile-client/components/Card';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {Row, Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {useUserMayEditSiteNote} from 'terraso-mobile-client/hooks/permissionHooks';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {formatDate, formatFullName} from 'terraso-mobile-client/util';

type Props = {
  note: SiteNote;
};

export const SiteNoteCard = ({note}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const isOffline = useIsOffline();
  const userCanEditNote = useUserMayEditSiteNote({
    siteId: note.siteId,
    noteId: note.id,
  });
  const canViewEditScreen = !isOffline && userCanEditNote;

  const onEditNote = useCallback(() => {
    if (canViewEditScreen) {
      navigation.navigate('EDIT_SITE_NOTE', {
        noteId: note.id,
        siteId: note.siteId,
      });
    }
  }, [navigation, canViewEditScreen, note]);

  return (
    <Card
      key={note.id}
      alignItems="flex-start"
      shadow={0}
      mb={3}
      ml={4}
      mr={4}
      onPress={onEditNote}>
      <Row>
        <Text variant="body2" italic>
          {t('site.notes.note_attribution', {
            createdAt: formatDate(note.createdAt),
            name: formatFullName(note.authorFirstName, note.authorLastName),
          })}
        </Text>
        <Spacer />
        {canViewEditScreen && <Icon name="edit" color="primary.dark" />}
      </Row>
      <Text pt={2}>{note.content}</Text>
    </Card>
  );
};
