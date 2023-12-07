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
import {
  NativeStackScreenProps,
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import React from 'react';
import {
  combinedScreenDefinitions,
  ScreenDefinitions,
} from 'terraso-mobile-client/navigation/screenDefinitions';

type UnknownToUndefined<T extends unknown> = unknown extends T ? undefined : T;

export type ParamList<T extends ScreenDefinitions> = {
  [K in keyof T]: UnknownToUndefined<React.ComponentProps<T[K]>>;
};

export type RootStackParamList = ParamList<typeof combinedScreenDefinitions>;

export const RootStack = createNativeStackNavigator<RootStackParamList>();

export type RootStackScreenProps = NativeStackScreenProps<RootStackParamList>;

export type ScreenName = keyof RootStackParamList;
