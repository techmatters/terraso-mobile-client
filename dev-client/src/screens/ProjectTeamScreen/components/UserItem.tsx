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

import {Button, Center, Image, Pressable} from 'native-base';
import {User} from 'terraso-client-shared/account/accountSlice';
import {useTranslation} from 'react-i18next';
import {useMemo} from 'react';
import {ProjectMembership} from 'terraso-client-shared/project/projectSlice';
import {ConfirmModal} from 'terraso-mobile-client/components/modals/ConfirmModal';
import {formatName} from 'terraso-mobile-client/util';
import {
  Box,
  HStack,
  VStack,
  Badge,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

type TriggerProps = {
  onOpen: () => void;
  message: string;
};

function LeaveProjectTrigger({onOpen, message}: TriggerProps) {
  return (
    <Center>
      <Button
        size="sm"
        my={2}
        w="50%"
        _text={{color: 'error.main'}}
        bgColor="grey.200"
        onPress={onOpen}>
        {message}
      </Button>
    </Center>
  );
}

type InfoProps = {
  membership: ProjectMembership;
  user: User;
  isCurrentUser: boolean;
};

const UserInfo = ({membership, user, isCurrentUser}: InfoProps) => {
  const {t} = useTranslation();
  const userLabel = useMemo(() => {
    let label = formatName(user.firstName, user.lastName);

    if (isCurrentUser) {
      label += ` (${t('general.you')})`;
    }
    return label;
  }, [user, isCurrentUser, t]);

  return (
    <HStack space={3} justifyContent="space-between" alignItems="center">
      <Box>
        <Image
          variant="profilePic"
          source={{uri: user.profileImage}}
          alt="profile pic"
        />
      </Box>
      <Text flex={3}>{userLabel}</Text>
      <Box>
        <Badge
          variant="chip"
          bg="primary.lighter"
          py="5px"
          px="10px"
          _text={{color: 'text.primary'}}>
          {t('general.role.' + membership.userRole)}
        </Badge>
      </Box>
    </HStack>
  );
};

type ItemProps = {
  membership: ProjectMembership;
  user: User;
  isCurrentUser: boolean;
  isManager: boolean;
  hasSingleManager: boolean;
  removeUser: () => void;
  memberAction: () => void;
};

export const UserItem = ({
  membership,
  user,
  isCurrentUser,
  isManager,
  hasSingleManager,
  removeUser,
  memberAction,
}: ItemProps) => {
  const {t} = useTranslation();

  /* Any non-manager user can leave the project, but managers can only leave if they are not the only manager. */
  const canLeaveProject = isCurrentUser && !(isManager && hasSingleManager);

  return (
    <Box borderBottomWidth="1" width={275} py={2}>
      <VStack>
        {!isCurrentUser && isManager ? (
          <Pressable onPress={memberAction}>
            <UserInfo
              membership={membership}
              user={user}
              isCurrentUser={isCurrentUser}
            />
          </Pressable>
        ) : (
          <UserInfo
            membership={membership}
            user={user}
            isCurrentUser={isCurrentUser}
          />
        )}
        {canLeaveProject && (
          <ConfirmModal
            trigger={onOpen => (
              <LeaveProjectTrigger
                onOpen={onOpen}
                message={t('projects.team.leave_project_modal.trigger')}
              />
            )}
            title={t('projects.team.leave_project_modal.title')}
            body={t('projects.team.leave_project_modal.body')}
            actionName={t('projects.team.leave_project_modal.action_name')}
            handleConfirm={removeUser}
          />
        )}
      </VStack>
    </Box>
  );
};
