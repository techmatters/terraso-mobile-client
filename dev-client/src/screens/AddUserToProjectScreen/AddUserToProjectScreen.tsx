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

import {useEffect} from 'react';
import {useTranslation} from 'react-i18next';

import {addMessage} from 'terraso-client-shared/notifications/notificationsSlice';

import {ScreenContentSection} from 'terraso-mobile-client/components/content/ScreenContentSection';
import {
  useNavToBottomTabsAndShowSyncError,
  usePopNavigationAndShowSyncError,
} from 'terraso-mobile-client/components/dataRequirements/handleMissingData';
import {
  ScreenDataRequirements,
  useMemoizedRequirements,
} from 'terraso-mobile-client/components/dataRequirements/ScreenDataRequirements';
import {offlineProjectScreenMessage} from 'terraso-mobile-client/components/messages/OfflineSnackbar';
import {Box, Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {useRoleCanEditProject} from 'terraso-mobile-client/hooks/permissionHooks';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {AddTeamMemberForm} from 'terraso-mobile-client/screens/AddUserToProjectScreen/components/AddTeamMemberForm';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {selectProject} from 'terraso-mobile-client/store/selectors';

type Props = {
  projectId: string;
};

export const AddUserToProjectScreen = ({projectId}: Props) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();

  const isOffline = useIsOffline();
  useEffect(() => {
    if (isOffline) {
      dispatch(addMessage(offlineProjectScreenMessage));
    }
  }, [isOffline, dispatch]);

  const project = useSelector(selectProject(projectId));

  // FYI: There was previously a mechanism to enter emails individually, but set roles at the same time.
  // This was replaced, but we could refer back to `userRecord` in previous versions if we ever end up
  // wanting to add multiple users at the same time.

  const userCanEditProject = useRoleCanEditProject(projectId);
  const handleMissingProject = useNavToBottomTabsAndShowSyncError();
  const handleInsufficientPermissions = usePopNavigationAndShowSyncError();
  const requirements = useMemoizedRequirements([
    {data: project, doIfMissing: handleMissingProject},
    {data: userCanEditProject, doIfMissing: handleInsufficientPermissions},
  ]);

  return (
    <ScreenDataRequirements requirements={requirements}>
      {() => (
        <ScreenScaffold AppBar={<AppBar title={project.name} />}>
          <ScreenContentSection title={t('projects.add_user.heading')}>
            <Text variant="body1">{t('projects.add_user.help_text')}</Text>
            <Box mt="md">
              <AddTeamMemberForm projectId={projectId} />
            </Box>
          </ScreenContentSection>
        </ScreenScaffold>
      )}
    </ScreenDataRequirements>
  );
};
