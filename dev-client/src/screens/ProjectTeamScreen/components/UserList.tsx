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

import {Button, Center, Divider, FlatList, Image, Pressable} from 'native-base';
import {User} from 'terraso-client-shared/account/accountSlice';
import {useTranslation} from 'react-i18next';
import {useMemo} from 'react';
import {
  ProjectMembership,
  ProjectRole,
} from 'terraso-client-shared/project/projectSlice';
import {ConfirmModal} from 'terraso-mobile-client/components/ConfirmModal';
import {formatName} from 'terraso-mobile-client/util';
import {
  Box,
  HStack,
  VStack,
  Badge,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

type ListProps = {
  memberships: [ProjectMembership, User][];
  currentUserId?: string;
  userAction: (membership: ProjectMembership) => () => void;
  memberAction: (userId: string, memberId: string) => () => void;
  currentUserRole: ProjectRole;
};

type ItemProps = {
  membership: ProjectMembership;
  user: User;
  currentUserId?: string;
  removeUser: () => void;
  memberAction: () => void;
  currentUserRole: ProjectRole;
};

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

const UserWrapper = ({
  isCurrentUser,
  memberAction,
  currentUserRole,
  children,
}: React.PropsWithChildren &
  Pick<ItemProps, 'memberAction'> & {
    isCurrentUser: boolean;
    currentUserRole: ProjectRole;
  }) =>
  !isCurrentUser && currentUserRole === 'MANAGER' ? (
    <Pressable onPress={memberAction}>{children}</Pressable>
  ) : (
    <>{children}</>
  );

function UserItem({
  membership,
  user,
  currentUserId,
  removeUser,
  memberAction,
  currentUserRole,
}: ItemProps) {
  const {t} = useTranslation();
  const isCurrentUser = useMemo(() => {
    return user.id === currentUserId;
  }, [user, currentUserId]);

  const userName = useMemo(() => {
    let name = formatName(user.firstName, user.lastName);

    if (isCurrentUser) {
      name += ` (${t('general.you')})`;
    }
    return name;
  }, [user, isCurrentUser, t]);

  return (
    <Box borderBottomWidth="1" width={275} py={2}>
      <VStack>
        <UserWrapper
          currentUserRole={currentUserRole}
          isCurrentUser={isCurrentUser}
          memberAction={memberAction}>
          <HStack space={3} justifyContent="space-between" alignItems="center">
            <Box>
              <Image
                variant="profilePic"
                source={{uri: user.profileImage}}
                alt="profile pic"
              />
            </Box>
            <Text flex={3}>{userName}</Text>
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
        </UserWrapper>
        {isCurrentUser && (
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
}

export const UserList = ({
  memberships,
  userAction,
  currentUserId,
  memberAction,
  currentUserRole,
}: ListProps) => {
  return (
    <FlatList
      data={memberships}
      renderItem={({item: [membership, user]}) => (
        <UserItem
          membership={membership}
          user={user}
          currentUserId={currentUserId}
          removeUser={userAction(membership)}
          memberAction={memberAction(user.id, membership.id)}
          currentUserRole={currentUserRole}
        />
      )}
      keyExtractor={([membership, _]) => membership.id}
      ItemSeparatorComponent={Divider}
    />
  );
};
