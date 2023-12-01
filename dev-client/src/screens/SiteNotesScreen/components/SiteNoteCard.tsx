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
import {Text, HStack, Spacer} from 'native-base';
import {useTranslation} from 'react-i18next';
import {Card} from 'terraso-mobile-client/components/Card';
import {formatDate, formatFullName} from 'terraso-mobile-client/util';
import {IconButton} from 'terraso-mobile-client/components/Icons';
import {SiteNote} from 'terraso-client-shared/site/siteSlice';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';

type Props = {
  note: SiteNote;
};

export const SiteNoteCard = ({note}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const onEditNote = useCallback(() => {
    navigation.navigate('EDIT_SITE_NOTE', {note: note});
  }, [navigation, note]);

  const onShowNote = useCallback(() => {
    navigation.navigate('READ_NOTE', {content: note.content});
  }, [navigation, note.content]);

  return (
    <Card
      key={note.id}
      alignItems="flex-start"
      shadow={0}
      mb={3}
      ml={4}
      mr={4}
      onPress={onShowNote}>
      <HStack>
        <Text italic>
          {t('site.notes.note_attribution', {
            createdAt: formatDate(note.createdAt),
            name: formatFullName(note.authorFirstName, note.authorLastName),
          })}
        </Text>
        <Spacer />
        <IconButton
          p={0}
          name="edit"
          _icon={{
            color: 'primary.dark',
            size: '5',
          }}
          onPress={onEditNote}
        />
      </HStack>
      <Text pt={1} fontSize="md" numberOfLines={3} ellipsizeMode="tail">
        {note.content}
      </Text>
    </Card>
  );
};
