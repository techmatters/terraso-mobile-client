/*
 * Copyright © 2026 Technology Matters
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

import {useMemo} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {SAFE_AREA_BOTTOM_PADDING_DEFAULT} from 'terraso-mobile-client/constants/safeArea';

/**
 * Bottom padding that clears the device safe area — the Android nav bar, the iOS
 * home indicator — for content that would otherwise run underneath it.
 *
 * Use this for anything that is not a plain ScrollView: a gesture-handler
 * ScrollView, a FlatList, or a non-scrolling panel. BottomInsetScrollView
 * covers the common case.
 *
 * @param minimumPadding - floor applied when the device reports no inset, as Android gesture navigation does
 */
export const useBottomInsetPadding = (
  minimumPadding = SAFE_AREA_BOTTOM_PADDING_DEFAULT,
) => {
  const {bottom} = useSafeAreaInsets();

  return useMemo(
    () => ({paddingBottom: Math.max(bottom, minimumPadding)}),
    [bottom, minimumPadding],
  );
};
