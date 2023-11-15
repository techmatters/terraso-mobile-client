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
import {Heading, HStack, Spacer, Box, VStack, Button} from 'native-base';
import {useDispatch} from 'terraso-mobile-client/model/store';
import {SiteNoteForm} from 'terraso-mobile-client/components/siteNotes/SiteNoteForm';
import {ScreenFormWrapper} from 'terraso-mobile-client/components/common/ScreenFormWrapper';
import {useTranslation} from 'react-i18next';
import {SiteNoteUpdateMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {
  updateSiteNote,
  deleteSiteNote,
  SiteNote,
} from 'terraso-client-shared/site/siteSlice';
import {useNavigation} from 'terraso-mobile-client/screens/AppScaffold';
import ConfirmModal from 'terraso-mobile-client/components/common/ConfirmModal';
import {HorizontalIconButton} from 'terraso-mobile-client/components/common/Icons';
import {Keyboard} from 'react-native';

type Props = {
  note: SiteNote;
};

export const EditSiteNoteScreen = ({note}: Props) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const handleUpdateNote = async ({content}: {content: string}) => {
    if (!content.trim()) {
      return;
    }
    Keyboard.dismiss();
    try {
      const siteNoteInput: SiteNoteUpdateMutationInput = {
        id: note.id,
        content: content,
      };
      const result = await dispatch(updateSiteNote(siteNoteInput));
      if (result.payload && 'error' in result.payload) {
        console.error(result.payload.error);
        console.error(result.payload.parsedErrors);
      }
    } catch (error) {
      console.error('Failed to update note:', error);
    } finally {
      navigation.pop();
    }
  };

  const handleDelete = useCallback(
    async (setSubmitting: (isSubmitting: boolean) => void) => {
      setSubmitting(true);
      await dispatch(deleteSiteNote(note)).then(() => navigation.pop());
      setSubmitting(false);
    },
    [navigation, dispatch, note],
  );

  return (
    <ScreenFormWrapper
      initialValues={{content: note.content}}
      onSubmit={handleUpdateNote}>
      {formikProps => {
        const {handleSubmit, isSubmitting} = formikProps;

        return (
          <VStack pt={10} pl={5} pr={5} pb={10} flex={1}>
            <Heading variant="h6" pb={7}>
              {t('site.notes.edit_title')}
            </Heading>
            <Box flexGrow={1}>
              <SiteNoteForm content={formikProps.values.content} />
            </Box>
            <HStack pb={4}>
              <Spacer />
              <ConfirmModal
                trigger={onOpen => (
                  <Box pt={1} pr={5}>
                    <HorizontalIconButton
                      p={0}
                      name="delete"
                      label={t('general.delete_fab').toLocaleUpperCase()}
                      colorScheme="error.main"
                      _icon={{
                        color: 'error.main',
                        size: '5',
                      }}
                      isDisabled={isSubmitting}
                      onPress={onOpen}
                    />
                  </Box>
                )}
                title={t('site.notes.confirm_removal_title')}
                body={t('site.notes.confirm_removal_body')}
                actionName={t('general.delete_fab')}
                handleConfirm={() => handleDelete(() => {})}
              />
              <Button
                onPress={() => handleSubmit()}
                isDisabled={isSubmitting}
                shadow={1}
                size={'lg'}>
                {t('general.done_fab').toLocaleUpperCase()}
              </Button>
            </HStack>
          </VStack>
        );
      }}
    </ScreenFormWrapper>
  );
};
