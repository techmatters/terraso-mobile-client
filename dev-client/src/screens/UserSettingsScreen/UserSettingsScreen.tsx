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

import {MenuList} from 'terraso-mobile-client/components/menus/MenuList';
import {Column} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {DeleteAccountItem} from 'terraso-mobile-client/screens/UserSettingsScreen/components/menu/DeleteAccountItem';
import {SignOutItem} from 'terraso-mobile-client/screens/UserSettingsScreen/components/menu/SignOutItem';
import {UserIndicator} from 'terraso-mobile-client/screens/UserSettingsScreen/components/UserIndicatorComponent';
import {VersionIndicator} from 'terraso-mobile-client/screens/UserSettingsScreen/components/VersionIndicatorComponent';

export function UserSettingsScreen() {
  return (
    <ScreenScaffold AppBar={<AppBar LeftButton={null} RightButton={null} />}>
      <Column margin="12px">
        <UserIndicator />
        <MenuList>
          <SignOutItem />
          <DeleteAccountItem />
        </MenuList>
        <VersionIndicator />
      </Column>
    </ScreenScaffold>
  );
}
