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

import {useEffect, useRef, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Keyboard} from 'react-native';

import {ProjectUpdateMutationInput} from 'terraso-client-shared/graphqlSchema/graphql';
import {addMessage} from 'terraso-client-shared/notifications/notificationsSlice';

import {
  useNavToBottomTabsAndShowSyncError,
  usePopNavigationAndShowSyncError,
} from 'terraso-mobile-client/components/dataRequirements/handleMissingData';
import {
  ScreenDataRequirements,
  useMemoizedRequirements,
} from 'terraso-mobile-client/components/dataRequirements/ScreenDataRequirements';
import {offlineProjectScreenMessage} from 'terraso-mobile-client/components/messages/OfflineSnackbar';
import {
  Box,
  Column,
  Heading,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {ScreenFormWrapper} from 'terraso-mobile-client/components/ScreenFormWrapper';
import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {useRoleCanEditProject} from 'terraso-mobile-client/hooks/permissionHooks';
import {updateProject} from 'terraso-mobile-client/model/project/projectGlobalReducer';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {SiteNoteForm} from 'terraso-mobile-client/screens/SiteNotesScreen/components/SiteNoteForm';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {selectProject} from 'terraso-mobile-client/store/selectors';

type Props = {
  projectId: string;
};

export const EditPinnedNoteScreen = ({projectId}: Props) => {
  const formWrapperRef = useRef<{handleSubmit: () => void}>(null);
  const {t} = useTranslation();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const project = useSelector(selectProject(projectId));
  const isOffline = useIsOffline();

  useEffect(() => {
    if (isOffline) {
      dispatch(addMessage(offlineProjectScreenMessage));
    }
  }, [isOffline, dispatch]);

  const handleUpdateProject = async ({content}: {content: string}) => {
    Keyboard.dismiss();
    setIsSubmitting(true);
    try {
      const projectInput: ProjectUpdateMutationInput = {
        id: project.id,
        // FYI: "pinned notes" historically have been called "site instructions" or "project instructions"
        siteInstructions: content,
      };
      await dispatch(updateProject(projectInput));
    } catch (error) {
      console.error('Failed to update project:', error);
    } finally {
      setIsSubmitting(false);
      navigation.pop();
    }
  };

  const handleDelete = async () => {
    await handleUpdateProject({content: ''});
  };

  const userCanEditProject = useRoleCanEditProject(projectId);
  const handleMissingProject = useNavToBottomTabsAndShowSyncError('project');
  const handleInsufficientPermissions = usePopNavigationAndShowSyncError(
    'project_edit_permission',
  );
  const requirements = useMemoizedRequirements([
    {data: project, doIfMissing: handleMissingProject},
    {data: userCanEditProject, doIfMissing: handleInsufficientPermissions},
  ]);

  return (
    <ScreenDataRequirements requirements={requirements}>
      {() => (
        <ScreenFormWrapper
          ref={formWrapperRef}
          initialValues={{content: project.siteInstructions || ''}}
          onSubmit={handleUpdateProject}
          onDelete={handleDelete}
          isSubmitting={isSubmitting}>
          {formikProps => (
            <Column pt={10} pl={5} pr={5} pb={10}>
              <Heading variant="h6" pb={7}>
                {t('projects.inputs.instructions.title')}
              </Heading>
              <Box>
                <SiteNoteForm content={formikProps.values.content || ''} />
              </Box>
            </Column>
          )}
        </ScreenFormWrapper>
      )}
    </ScreenDataRequirements>
  );
};
