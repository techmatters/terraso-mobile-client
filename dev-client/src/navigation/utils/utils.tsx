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
  TypedNavigator,
  useNavigation as useNavigationNative,
} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {ScreenDefinitions} from 'terraso-mobile-client/navigation/types';

export const generateScreens = <
  T extends TypedNavigator<any, any, any, any, any>,
>(
  Navigator: T,
  definitions: ScreenDefinitions,
) =>
  Object.entries(definitions).map(([name, Screen]) => (
    <Navigator.Screen
      name={name}
      key={name}
      children={props => <Screen {...((props.route.params ?? {}) as any)} />}
    />
  ));

export const createNavigationHook =
  <ParamList extends ParamListBase>() =>
  <Name extends keyof ParamList>() =>
    useNavigationNative<NativeStackNavigationProp<ParamList, Name>>();
