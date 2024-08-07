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

import {User} from 'terraso-client-shared/account/accountSlice';
import {
  PROJECT_ROLES,
  ProjectRole,
} from 'terraso-client-shared/project/projectSlice';

import {ProfilePic} from 'terraso-mobile-client/components/content/images/ProfilePic';
import {IconButton} from 'terraso-mobile-client/components/icons/IconButton';
import {Select} from 'terraso-mobile-client/components/inputs/Select';
import {
  Column,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {formatName} from 'terraso-mobile-client/util';

export type UserFields = Omit<User, 'preferences'>;

type DisplayProps = {
  user: UserFields;
  role: ProjectRole;
  updateUserRole: (role: ProjectRole) => void;
  removeUser: () => void;
};

export const UserDisplay = ({
  user,
  role,
  updateUserRole,
  removeUser,
}: DisplayProps) => {
  const {t} = useTranslation();
  const renderRole = useCallback(
    (value: ProjectRole) => t(`general.role.${value}`),
    [t],
  );
  const {firstName, lastName, email} = user;
  return (
    <Column space="5px">
      <Row mt="15px">
        <ProfilePic user={user} />
        <Column flexGrow={2} ml="15px">
          <Text fontWeight={700} fontSize="16px">
            {formatName(firstName, lastName)}
          </Text>
          <Text fontWeight={400} fontSize="14px">
            {email}
          </Text>
        </Column>
        <IconButton name="delete" onPress={removeUser} />
      </Row>
      <Select
        nullable={false}
        value={role}
        onValueChange={updateUserRole}
        options={PROJECT_ROLES}
        renderValue={renderRole}
      />
    </Column>
  );
};
