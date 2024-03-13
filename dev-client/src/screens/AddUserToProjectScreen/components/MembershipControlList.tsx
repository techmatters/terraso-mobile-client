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
import {ProjectRole} from 'terraso-client-shared/project/projectSlice';

import {
  UserDisplay,
  UserFields,
} from 'terraso-mobile-client/screens/AddUserToProjectScreen/components/UserDisplay';

export type UserWithRole = {user: UserFields; role: ProjectRole};

type Props = {
  users: UserWithRole[];
  updateUserRole: (role: ProjectRole, userId: string) => void;
  removeUser: (userId: string) => void;
};

export const MembershipControlList = ({
  users,
  updateUserRole,
  removeUser,
}: Props) => {
  const itemUpdateUserRole = (userId: string) => (role: ProjectRole) =>
    updateUserRole(role, userId);
  const itemRemoveUser = (userId: string) => () => removeUser(userId);
  return (
    <FlatList
      renderItem={({item: {user, role}}) => (
        <UserDisplay
          user={user}
          role={role}
          updateUserRole={itemUpdateUserRole(user.id)}
          removeUser={itemRemoveUser(user.id)}
        />
      )}
      ListHeaderComponent={Divider}
      ListFooterComponent={Divider}
      ItemSeparatorComponent={Divider}
      data={users}
      keyExtractor={({user: {id}}) => id}
      mx="15px"
      my="15px"
      w="90%"
    />
  );
};

export default MembershipControlList;
