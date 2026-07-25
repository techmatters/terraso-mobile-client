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

import {
  ParamListBase,
  useNavigation as useNavigationNative,
} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {ScreenDefinitions} from 'terraso-mobile-client/navigation/types';

// react-navigation v7's TypedNavigator generic shape got tighter
// (Bag extends NavigatorTypeBagBase) after the SDK 56 upgrade. This helper
// only uses `.Screen`, so we duck-type on that instead of trying to satisfy
// the full navigator-type-bag machinery.
type NavigatorLike = {Screen: React.ComponentType<any>};

export const generateScreens = <T extends NavigatorLike>(
  Navigator: T,
  definitions: ScreenDefinitions,
) =>
  Object.entries(definitions).map(([name, Screen]) => (
    <Navigator.Screen
      name={name}
      key={name}
      children={(props: any) => (
        <Screen {...((props.route.params ?? {}) as any)} />
      )}
    />
  ));

export const createNavigationHook =
  <ParamList extends ParamListBase>() =>
  <Name extends keyof ParamList>() =>
    useNavigationNative<NativeStackNavigationProp<ParamList, Name>>();
