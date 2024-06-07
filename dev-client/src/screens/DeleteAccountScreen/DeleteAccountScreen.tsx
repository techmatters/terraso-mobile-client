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

import {Text} from 'react-native-paper';

import {VStack} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {AppBar} from 'terraso-mobile-client/navigation/components/AppBar';
import {ScreenBackButton} from 'terraso-mobile-client/navigation/components/ScreenBackButton';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';

export function DeleteAccountScreen() {
  return (
    <ScreenScaffold AppBar={<AppBar LeftButton={<ScreenBackButton />} />}>
      <VStack height="full" margin="12px">
        <Text>Hello, world!</Text>
      </VStack>
    </ScreenScaffold>
  );
}
