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

import {useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Keyboard} from 'react-native';

import {SiteNoteAddMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';

import {trackSoilObservation} from 'terraso-mobile-client/analytics/soilObservationTracking';
import {
  useNavToBottomTabsAndShowSyncError,
  usePopNavigationAndShowSyncError,
} from 'terraso-mobile-client/components/dataRequirements/handleMissingData';
import {
  ScreenDataRequirements,
  useMemoizedRequirements,
} from 'terraso-mobile-client/components/dataRequirements/ScreenDataRequirements';
import {
  Box,
  Column,
  Heading,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {ScreenFormWrapper} from 'terraso-mobile-client/components/ScreenFormWrapper';
import {useRoleCanEditSite} from 'terraso-mobile-client/hooks/permissionHooks';
import {addSiteNote} from 'terraso-mobile-client/model/site/siteSlice';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {SiteNoteForm} from 'terraso-mobile-client/screens/SiteNotesScreen/components/SiteNoteForm';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {selectSite} from 'terraso-mobile-client/store/selectors';

type Props = {
  siteId: string;
};

export const AddSiteNoteScreen = ({siteId}: Props) => {
  const formWrapperRef = useRef<{handleSubmit: () => void}>(null);
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddNote = async ({content}: {content: string}) => {
    if (!content.trim()) {
      return;
    }
    Keyboard.dismiss();
    setIsSubmitting(true);
    try {
      const siteNoteInput: SiteNoteAddMutationInput = {
        siteId,
        content: content,
      };
      await dispatch(addSiteNote(siteNoteInput));
      trackSoilObservation({
        input_type: 'notes',
        input_method: 'manual',
        site_id: siteId,
      });
    } catch (error) {
      console.error('Failed to add note:', error);
    } finally {
      setIsSubmitting(false);
      navigation.pop();
    }
  };

  const handleDelete = () => {
    navigation.pop();
  };

  const site = useSelector(selectSite(siteId));
  const userCanEditSite = useRoleCanEditSite(siteId);
  const handleInsufficientPermissions = usePopNavigationAndShowSyncError();

  const handleMissingSite = useNavToBottomTabsAndShowSyncError();
  const requirements = useMemoizedRequirements([
    {data: site, doIfMissing: handleMissingSite},
    {data: userCanEditSite, doIfMissing: handleInsufficientPermissions},
  ]);

  return (
    <ScreenDataRequirements requirements={requirements}>
      {() => (
        <ScreenFormWrapper
          ref={formWrapperRef}
          initialValues={{content: ''}}
          onSubmit={handleAddNote}
          onDelete={handleDelete}
          isSubmitting={isSubmitting}>
          {formikProps => (
            <Column pt={10} pl={5} pr={5} pb={10} flex={1}>
              <Heading variant="h6" pb={7}>
                {t('site.notes.add_title')}
              </Heading>
              <Box flexGrow={1}>
                <SiteNoteForm content={formikProps.values.content || ''} />
              </Box>
            </Column>
          )}
        </ScreenFormWrapper>
      )}
    </ScreenDataRequirements>
  );
};
