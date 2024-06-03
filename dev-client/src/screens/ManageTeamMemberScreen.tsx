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

import {useCallback, useState} from 'react';
import {useTranslation} from 'react-i18next';

import {Button, Divider} from 'native-base';

import {
  deleteUserFromProject,
  ProjectRole,
  updateUserRole,
} from 'terraso-client-shared/project/projectSlice';

import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {ConfirmModal} from 'terraso-mobile-client/components/modals/ConfirmModal';
import {
  Box,
  Text,
  VStack,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {RadioBlock} from 'terraso-mobile-client/components/RadioBlock';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {ScreenCloseButton} from 'terraso-mobile-client/navigation/components/ScreenCloseButton';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {useDispatch, useSelector} from 'terraso-mobile-client/store';
import {formatName} from 'terraso-mobile-client/util';

type Props = {
  projectId: string;
  userId: string;
  membershipId: string;
};

export const ManageTeamMemberScreen = ({
  projectId,
  userId,
  membershipId,
}: Props) => {
  const {t} = useTranslation();
  const dispatch = useDispatch();
  const navigation = useNavigation();

  const project = useSelector(state => state.project.projects[projectId]);
  const user = useSelector(state => state.account.users[userId]);
  const membership = project?.memberships[membershipId];

  const [selectedRole, setSelectedRole] = useState<ProjectRole>(
    membership ? membership.userRole : 'MANAGER',
  );

  const removeMembership = useCallback(async () => {
    await dispatch(
      deleteUserFromProject({
        userId,
        projectId,
      }),
    );
    navigation.pop();
  }, [dispatch, projectId, userId, navigation]);

  const updateUser = useCallback(async () => {
    await dispatch(updateUserRole({projectId, userId, newRole: selectedRole}));
    navigation.pop();
  }, [dispatch, projectId, userId, selectedRole, navigation]);

  return (
    <ScreenScaffold
      AppBar={
        <AppBar title={project?.name} LeftButton={<ScreenCloseButton />} />
      }>
      <VStack mx="14px">
        <VStack mt="22px" mb="15px">
          <Text variant="body1" fontWeight={700}>
            {formatName(user.firstName, user.lastName)}
          </Text>
          <Text numberOfLines={1} variant="body1">
            {user.email}
          </Text>
        </VStack>
        <RadioBlock<ProjectRole>
          labelProps={{variant: 'secondary'}}
          label={t('projects.manage_member.project_role')}
          options={{
            MANAGER: {
              text: t('general.role.MANAGER'),
              helpText: t('projects.manage_member.manager_help'),
            },
            CONTRIBUTOR: {
              text: t('general.role.CONTRIBUTOR'),
              helpText: t('projects.manage_member.contributor_help'),
            },
            VIEWER: {
              text: t('general.role.VIEWER'),
              helpText: t('projects.manage_member.viewer_help'),
            },
          }}
          groupProps={{
            onChange: setSelectedRole,
            value: selectedRole,
            name: 'selected-role',
          }}
        />

        <Divider my="20px" width="90%" alignSelf="center" />

        <VStack>
          <ConfirmModal
            trigger={onOpen => (
              <Button
                size="sm"
                variant="ghost"
                alignSelf="start"
                width="70%"
                onPress={onOpen}
                _text={{color: 'error.main'}}
                _pressed={{backgroundColor: 'red.100'}}
                textTransform="uppercase"
                leftIcon={<Icon name="delete" color="error.main" />}>
                {t('projects.manage_member.remove')}
              </Button>
            )}
            title={t('projects.manage_member.confirm_removal_title')}
            body={t('projects.manage_member.confirm_removal_body')}
            actionName={t('projects.manage_member.confirm_removal_action')}
            handleConfirm={removeMembership}
          />
          <Text ml="20px" variant="caption">
            {t('projects.manage_member.remove_help')}
          </Text>
        </VStack>

        <Box flex={0} height="15%" justifyContent="flex-end">
          <Button onPress={updateUser} alignSelf="flex-end">
            {t('general.save_fab')}
          </Button>
        </Box>
      </VStack>
    </ScreenScaffold>
  );
};
