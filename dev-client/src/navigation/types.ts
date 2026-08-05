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
import React from 'react';

import {NavigatorScreenParams} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import {
  bottomTabScreensDefinitions,
  combinedScreenDefinitions,
} from 'terraso-mobile-client/navigation/screenDefinitions';

type UnknownToUndefined<T extends unknown> = unknown extends T ? undefined : T;

export type ParamList<T extends ScreenDefinitions> = {
  [K in keyof T]: UnknownToUndefined<React.ComponentProps<T[K]>>;
};

/* ParamList derives each route's params from its screen component's props, which can't express two things these routes need: params that are optional, and a parent route that forwards {screen, params} into a nested navigator. Both are declared by hand here. */
export type BottomTabsParamList = Omit<
  ParamList<typeof bottomTabScreensDefinitions>,
  'SITES'
> & {
  SITES: {calloutSiteId?: string} | undefined;
};

export type RootStackParamList = Omit<
  ParamList<typeof combinedScreenDefinitions>,
  'BOTTOM_TABS'
> & {
  BOTTOM_TABS: NavigatorScreenParams<BottomTabsParamList> | undefined;
};

export const RootStack = createNativeStackNavigator<RootStackParamList>();

export type RootStackScreenProps = NativeStackScreenProps<RootStackParamList>;

export type ScreenName = keyof RootStackParamList;

export type ScreenDefinitions = Record<string, React.FC<any>>;
