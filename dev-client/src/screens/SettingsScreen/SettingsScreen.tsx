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

import {VStack} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {VersionIndicator} from 'terraso-mobile-client/screens/SettingsScreen/components/VersionIndicatorComponent';
import {UserIndicator} from 'terraso-mobile-client/screens/SettingsScreen/components/UserIndicatorComponent';
import {LogOutButton} from 'terraso-mobile-client/screens/SettingsScreen/components/actions/LogOutButton';
import {DeleteAccountButton} from 'terraso-mobile-client/screens/SettingsScreen/components/actions/DeleteAccountButton';
import {ButtonList} from 'terraso-mobile-client/components/buttons/ButtonList';

export function SettingsScreen() {
  return (
    <ScreenScaffold AppBar={<AppBar LeftButton={null} RightButton={null} />}>
      <VStack height="full" margin="12px">
        <UserIndicator />
        <ButtonList>
          <LogOutButton />
          <DeleteAccountButton />
        </ButtonList>
        <VersionIndicator />
      </VStack>
    </ScreenScaffold>
  );
}
