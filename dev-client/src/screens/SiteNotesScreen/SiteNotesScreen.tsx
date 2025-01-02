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
import {ScrollView} from 'react-native';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {useNavToBottomTabsAndShowSyncError} from 'terraso-mobile-client/components/dataRequirements/handleMissingData';
import {
  ScreenDataRequirements,
  useMemoizedRequirements,
} from 'terraso-mobile-client/components/dataRequirements/ScreenDataRequirements';
import {
  Box,
  Column,
  Heading,
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RestrictBySiteRole} from 'terraso-mobile-client/components/restrictions/RestrictByRole';
import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {SITE_EDITOR_ROLES} from 'terraso-mobile-client/model/permissions/permissions';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {OfflineMessageBox} from 'terraso-mobile-client/screens/LocationScreens/components/soilId/messageBoxes/OfflineMessageBox';
import {PinnedNoteCard} from 'terraso-mobile-client/screens/SiteNotesScreen/components/PinnedNoteCard';
import {SiteNoteCard} from 'terraso-mobile-client/screens/SiteNotesScreen/components/SiteNoteCard';
import {useSelector} from 'terraso-mobile-client/store';
import {selectSite} from 'terraso-mobile-client/store/selectors';

export const SiteNotesScreen = ({siteId}: {siteId: string}) => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const site = useSelector(selectSite(siteId));
  const project = useSelector(state =>
    site.projectId === undefined
      ? undefined
      : state.project.projects[site.projectId],
  );

  const onAddNote = useCallback(() => {
    navigation.navigate('ADD_SITE_NOTE', {siteId: siteId});
  }, [navigation, siteId]);

  const isOffline = useIsOffline();

  const handleMissingSite = useNavToBottomTabsAndShowSyncError();
  const requirements = useMemoizedRequirements([
    {data: site, doIfMissing: handleMissingSite},
  ]);

  return (
    <ScreenDataRequirements requirements={requirements}>
      {() => (
        <ScrollView>
          <Column>
            <Row backgroundColor="background.default" px="16px" py="12px">
              <Heading variant="h6">{t('site.notes.title')}</Heading>
            </Row>
            <Box height="16px" />
            {project?.siteInstructions && <PinnedNoteCard project={project} />}
            <RestrictBySiteRole role={SITE_EDITOR_ROLES}>
              <Box
                pl={4}
                pb={4}
                pr={4}
                alignItems={isOffline ? undefined : 'flex-start'}>
                {isOffline ? (
                  <OfflineMessageBox message={t('site.notes.offline')} />
                ) : (
                  <ContainedButton
                    size="lg"
                    onPress={onAddNote}
                    label={t('site.notes.add_note_label')}
                  />
                )}
              </Box>
            </RestrictBySiteRole>

            {Object.values(site.notes).map(note => (
              <SiteNoteCard note={note} key={note.id} />
            ))}
            {site.notes && <Box height="300px" />}
          </Column>
        </ScrollView>
      )}
    </ScreenDataRequirements>
  );
};
