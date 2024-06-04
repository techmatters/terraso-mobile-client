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
import {
  deleteSiteNote,
  SiteNote,
  updateSiteNote,
} from 'terraso-client-shared/site/siteSlice';

import {
  Box,
  Heading,
  VStack,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {ScreenFormWrapper} from 'terraso-mobile-client/components/ScreenFormWrapper';
import {SiteNoteForm} from 'terraso-mobile-client/components/SiteNoteForm';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {useDispatch} from 'terraso-mobile-client/store';

type Props = {
  note: SiteNote;
};

export const EditSiteNoteScreen = ({note}: Props) => {
  const formWrapperRef = useRef<{handleSubmit: () => void}>(null);
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdateNote = async ({content}: {content: string}) => {
    if (!content.trim()) {
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
    } catch (error) {
      console.error('Failed to update note:', error);
    } finally {
      setIsSubmitting(false);
      navigation.pop();
    }
  };

  const handleDelete = useCallback(async () => {
    setIsSubmitting(true);
    await dispatch(deleteSiteNote(note)).then(() => navigation.pop());
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
        <VStack pt={10} pl={5} pr={5} pb={10} flex={1}>
          <Heading variant="h6" pb={7}>
            {t('site.notes.edit_title')}
          </Heading>
          <Box flexGrow={1}>
            <SiteNoteForm content={formikProps.values.content} />
          </Box>
        </VStack>
      )}
    </ScreenFormWrapper>
  );
};
