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

import {VStack} from 'native-base';
import {AddButton} from 'terraso-mobile-client/components/AddButton';
import {UserList} from 'terraso-mobile-client/screens/ProjectTeamScreen/components/UserList';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {useCallback} from 'react';
import {
  ProjectMembership,
  deleteUserFromProject,
} from 'terraso-client-shared/project/projectSlice';
import {selectProjectMembershipsWithUsers} from 'terraso-client-shared/selectors';
import {useTranslation} from 'react-i18next';
import {
  ProjectTabNavigatorScreenProps,
  ProjectTabNavigatorScreens,
  RootNavigatorScreens,
} from 'terraso-mobile-client/navigation/types';
import {useProjectDataContext} from 'terraso-mobile-client/navigation/hooks/useProjectDataContext';

type Props = ProjectTabNavigatorScreenProps<ProjectTabNavigatorScreens.TEAM>;

export const ProjectTeamScreen = ({navigation}: Props) => {
  const {projectId} = useProjectDataContext();

  const {t} = useTranslation();
  const dispatch = useDispatch();
  const currentUser = useSelector(state => state.account.currentUser);
  const currentUserRole = useSelector(state => {
    const memberships = Object.values(
      state.project.projects[projectId]?.memberships ?? {},
    ).filter(({userId}) => userId === currentUser?.data?.id);
    return memberships.length > 0 ? memberships[0].userRole : 'viewer';
  });
  const members = useSelector(state =>
    selectProjectMembershipsWithUsers(state, projectId),
  );

  const removeMembership = useCallback(
    (membership: ProjectMembership) => {
      return async () => {
        dispatch(
          deleteUserFromProject({
            projectId,
            userId: membership.userId,
          }),
        );
      };
    },
    [dispatch, projectId],
  );

  const manageMember = useCallback(
    (userId: string, membershipId: string) => {
      return async () => {
        navigation.navigate(RootNavigatorScreens.MANAGE_TEAM_MEMBER, {
          userId,
          membershipId,
          projectId,
        });
      };
    },
    [navigation, projectId],
  );

  return (
    <VStack alignItems="flex-start" p={4} space={3}>
      <AddButton
        text={t('projects.team.add')}
        buttonProps={{
          onPress: () =>
            navigation.navigate(RootNavigatorScreens.ADD_USER_PROJECT, {
              projectId,
            }),
        }}
      />
      <UserList
        memberships={members}
        currentUserId={currentUser.data?.id}
        userAction={removeMembership}
        memberAction={manageMember}
        currentUserRole={currentUserRole}
      />
    </VStack>
  );
};
