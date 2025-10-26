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

import {useCallback, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Keyboard} from 'react-native';

import {SiteNoteUpdateMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {SiteNote} from 'terraso-client-shared/site/siteTypes';

import {trackSoilObservation} from 'terraso-mobile-client/analytics/soilObservationTracking';
import {
  Box,
  Column,
  Heading,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {ScreenFormWrapper} from 'terraso-mobile-client/components/ScreenFormWrapper';
import {
  deleteSiteNote,
  updateSiteNote,
} from 'terraso-mobile-client/model/site/siteSlice';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {SiteNoteForm} from 'terraso-mobile-client/screens/SiteNotesScreen/components/SiteNoteForm';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

type Props = {
  note: SiteNote;
};

export const EditSiteNoteContent = ({note}: Props) => {
  const formWrapperRef = useRef<{handleSubmit: () => void}>(null);
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUser = useSelector(state => state.account.currentUser.data);
  const currentUserIsAuthor = note?.authorId === currentUser?.id;

  const handleUpdateNote = async ({content}: {content: string}) => {
    if (!currentUserIsAuthor) {
      navigation.pop();
      return;
    } else if (!content.trim()) {
      return;
    }
    Keyboard.dismiss();
    setIsSubmitting(true);
    try {
      const siteNoteInput: SiteNoteUpdateMutationInput = {
        id: note.id,
        content: content,
      };
      await dispatch(updateSiteNote(siteNoteInput));
      trackSoilObservation({
        input_type: 'notes',
        input_method: 'manual',
        site_id: note.siteId,
      });
    } catch (error) {
      console.error('Failed to update note:', error);
    } finally {
      setIsSubmitting(false);
      navigation.pop();
    }
  };

  const handleDelete = useCallback(async () => {
    setIsSubmitting(true);
    navigation.pop();
    await dispatch(deleteSiteNote(note));
    setIsSubmitting(false);
  }, [navigation, dispatch, note]);

  return (
    <ScreenFormWrapper
      ref={formWrapperRef}
      initialValues={{content: note.content}}
      onSubmit={handleUpdateNote}
      onDelete={handleDelete}
      isSubmitting={isSubmitting}>
      {formikProps => (
        <Column pt={10} pl={5} pr={5} pb={10} flex={1}>
          <Heading variant="h6" pb={7}>
            {t('site.notes.edit_title')}
          </Heading>
          <Box flexGrow={1}>
            <SiteNoteForm
              content={formikProps.values.content}
              editDisabled={!currentUserIsAuthor}
            />
          </Box>
        </Column>
      )}
    </ScreenFormWrapper>
  );
};
