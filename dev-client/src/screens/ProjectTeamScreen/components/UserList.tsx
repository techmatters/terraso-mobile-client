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

import {Divider, FlatList} from 'native-base';
import {useMemo} from 'react';
import {User} from 'terraso-client-shared/account/accountSlice';
import {
  ProjectMembership,
  ProjectRole,
} from 'terraso-client-shared/project/projectSlice';
import {UserItem} from 'terraso-mobile-client/screens/ProjectTeamScreen/components/UserItem';

type ListProps = {
  memberships: [ProjectMembership, User][];
  currentUserId?: string;
  removeUser: (membership: ProjectMembership) => () => void;
  memberAction: (userId: string, memberId: string) => () => void;
  currentUserRole: ProjectRole;
};

export const UserList = ({
  memberships,
  removeUser,
  currentUserId,
  memberAction,
  currentUserRole,
}: ListProps) => {
  const hasSingleManager = useMemo(
    () => memberships.filter(m => m[0].userRole === 'MANAGER').length === 1,
    [memberships],
  );

  return (
    <FlatList
      data={memberships}
      renderItem={({item: [membership, user]}) => (
        <UserItem
          membership={membership}
          user={user}
          isCurrentUser={user.id === currentUserId}
          isManager={currentUserRole === 'MANAGER'}
          hasSingleManager={hasSingleManager}
          removeUser={removeUser(membership)}
          memberAction={memberAction(user.id, membership.id)}
        />
      )}
      keyExtractor={([membership, _]) => membership.id}
      ItemSeparatorComponent={Divider}
    />
  );
};
