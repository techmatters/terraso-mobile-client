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

import {Image, Select, Text} from 'native-base';
import {Icon, IconButton} from 'terraso-mobile-client/components/Icons';
import {formatName} from 'terraso-mobile-client/util';
import {UserRole} from 'terraso-client-shared/graphqlSchema/graphql';
import {useTranslation} from 'react-i18next';
import {User} from 'terraso-client-shared/account/accountSlice';
import {
  HStack,
  VStack,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

export type UserFields = Omit<User, 'preferences'>;

type DisplayProps = {
  user: UserFields;
  role: UserRole;
  roles: [UserRole, string][];
  updateUserRole: (role: UserRole) => void;
  removeUser: () => void;
};

export const UserDisplay = ({
  user: {profileImage, firstName, lastName, email},
  roles,
  role,
  updateUserRole,
  removeUser,
}: DisplayProps) => {
  const {t} = useTranslation();
  return (
    <VStack space="5px">
      <HStack mt="15px">
        <Image
          variant="profilePic"
          source={{uri: profileImage}}
          alt={t('general.profile_image_alt')}
        />
        <VStack flexGrow={2} ml="15px">
          <Text fontWeight={700} fontSize="16px">
            {formatName(firstName, lastName)}
          </Text>
          <Text fontWeight={400} fontSize="14px">
            {email}
          </Text>
        </VStack>
        <IconButton name="delete" onPress={removeUser} />
      </HStack>
      <Select
        width="60%"
        ml="50px"
        variant="unstyled"
        dropdownCloseIcon={<Icon name="arrow-drop-down" />}
        dropdownOpenIcon={<Icon name="arrow-drop-down" />}
        selectedValue={role}
        onValueChange={value => {
          updateUserRole(value as UserRole);
        }}>
        {roles.map(([roleName, label]) => (
          <Select.Item value={roleName} label={label} key={roleName} />
        ))}
      </Select>
    </VStack>
  );
};
