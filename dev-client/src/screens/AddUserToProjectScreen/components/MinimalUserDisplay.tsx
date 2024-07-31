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

import {ProfilePic} from 'terraso-mobile-client/components/content/images/ProfilePic';
import {
  Column,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {UserFields} from 'terraso-mobile-client/screens/AddUserToProjectScreen/components/UserDisplay';
import {formatName} from 'terraso-mobile-client/util';

type DisplayProps = {
  user: UserFields;
};

export const MinimalUserDisplay = ({user}: DisplayProps) => {
  const {firstName, lastName, email} = user;
  return (
    <Column>
      <Row>
        <ProfilePic user={user} />

        <Column ml="32px">
          <Text variant="body1-strong">{formatName(firstName, lastName)}</Text>
          <Text variant="body1">{email}</Text>
        </Column>
      </Row>
    </Column>
  );
};
