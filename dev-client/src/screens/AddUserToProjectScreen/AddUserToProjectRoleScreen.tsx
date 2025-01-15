/*
 * Copyright © 2024 Technology Matters
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

import {useCallback, useState} from 'react';
import {useTranslation} from 'react-i18next';

import {TabActions} from '@react-navigation/native';

import {ProjectRole} from 'terraso-client-shared/project/projectTypes';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {ScreenContentSection} from 'terraso-mobile-client/components/content/ScreenContentSection';
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
  Row,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useRoleCanEditProject} from 'terraso-mobile-client/hooks/permissionHooks';
import {addUserToProject} from 'terraso-mobile-client/model/project/projectGlobalReducer';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {TabRoutes} from 'terraso-mobile-client/navigation/constants';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {MinimalUserDisplay} from 'terraso-mobile-client/screens/AddUserToProjectScreen/components/MinimalUserDisplay';
import {ProjectRoleRadioBlock} from 'terraso-mobile-client/screens/AddUserToProjectScreen/components/ProjectRoleRadioBlock';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';

type Props = {
  projectId: string;
  userId: string;
};

export const AddUserToProjectRoleScreen = ({projectId, userId}: Props) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const project = useSelector(state => state.project.projects[projectId]);
  const user = useSelector(state => state.account.users[userId]);

  const [selectedRole, setSelectedRole] = useState<ProjectRole>('VIEWER');

  const addUser = useCallback(async () => {
    try {
      dispatch(
        addUserToProject({userId: user.id, role: selectedRole, projectId}),
      );
    } catch (e) {
      console.error(e);
    }
    navigation.navigate('PROJECT_VIEW', {projectId: projectId});
    navigation.dispatch(TabActions.jumpTo(TabRoutes.TEAM));
  }, [dispatch, projectId, user, selectedRole, navigation]);

  const roleIsEditor = useRoleCanEditProject(projectId);
  const handleInsufficientPermissions = usePopNavigationAndShowSyncError();
  const handleMissingProject = useNavToBottomTabsAndShowSyncError();
  const handleMissingUser = usePopNavigationAndShowSyncError();
  const requirements = useMemoizedRequirements([
    {data: project, doIfMissing: handleMissingProject},
    {data: roleIsEditor, doIfMissing: handleInsufficientPermissions},
    {data: user, doIfMissing: handleMissingUser},
  ]);

  return (
    <ScreenDataRequirements requirements={requirements}>
      {() => (
        <ScreenScaffold AppBar={<AppBar title={project?.name} />}>
          <ScreenContentSection title={t('projects.add_user.heading')}>
            <Column>
              <Box ml="md" my="lg">
                <MinimalUserDisplay user={user} />
              </Box>

              <ProjectRoleRadioBlock
                onChange={setSelectedRole}
                selectedRole={selectedRole}
              />

              <Row
                flex={0}
                justifyContent="flex-end"
                alignItems="center"
                space="12px"
                pt="md">
                <ContainedButton
                  label={t('general.add')}
                  onPress={addUser}
                  size="lg"
                />
              </Row>
            </Column>
          </ScreenContentSection>
        </ScreenScaffold>
      )}
    </ScreenDataRequirements>
  );
};
