/*
 * Copyright © 2025 Technology Matters
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

import {IScrollViewProps, ScrollView} from 'native-base';

import {SAFE_AREA_BOTTOM_PADDING_DEFAULT} from 'terraso-mobile-client/constants/safeArea';

type Props = IScrollViewProps & {
  minimumPadding?: number;
};

/**
 * A ScrollView that automatically applies bottom content padding based on
 * device safe area insets (e.g., for Android soft navigation buttons).
 *
 * This ensures scrollable content isn't cut off by system UI elements while
 * avoiding the issue of adding padding to the entire screen container.
 *
 * Use this base component for general scrollable content without bottom action buttons.
 * For screens with FAB buttons, use SafeScrollViewWithFab instead.
 * For screens with button rows at the bottom, use SafeScrollViewWithButtons instead.
 *
 * @param minimumPadding - Minimum padding to apply even when insets.bottom is 0 (default from constant)
 *
 * @example
 * <SafeScrollView>
 *   <Text>Scrollable content</Text>
 * </SafeScrollView>
 */
export const SafeScrollView = ({
  children,
  minimumPadding = SAFE_AREA_BOTTOM_PADDING_DEFAULT,
  contentContainerStyle,
  ...props
}: Props) => {
  const insets = useSafeAreaInsets();

  const safeContentStyle = useMemo(
    () => [
      {paddingBottom: Math.max(insets.bottom, minimumPadding)},
      contentContainerStyle,
    ],
    [insets.bottom, minimumPadding, contentContainerStyle],
  );

  return (
    <ScrollView {...props} contentContainerStyle={safeContentStyle}>
      {children}
    </ScrollView>
  );
};
