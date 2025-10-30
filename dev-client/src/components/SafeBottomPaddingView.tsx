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

import {ReactNode, useMemo} from 'react';
import {ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {SAFE_AREA_BOTTOM_PADDING_DEFAULT} from 'terraso-mobile-client/constants/safeArea';

type Props = {
  children: ReactNode;
  minimumPadding?: number;
  style?: ViewStyle;
};

/**
 * A container component that automatically applies bottom padding based on
 * device safe area insets (e.g., for Android soft navigation buttons).
 *
 * Use this for non-scrollable content that needs bottom padding.
 * For scrollable content, use SafeScrollView or its variants instead.
 *
 * @param minimumPadding - Minimum padding to apply even when insets.bottom is 0 (default from constant)
 * @param style - Additional styles to apply to the container
 *
 * @example
 * <SafeBottomPaddingView>
 *   <Text>Content that needs bottom padding</Text>
 * </SafeBottomPaddingView>
 */
export const SafeBottomPaddingView = ({
  children,
  minimumPadding = SAFE_AREA_BOTTOM_PADDING_DEFAULT,
  style,
}: Props) => {
  const insets = useSafeAreaInsets();

  const paddingStyle = useMemo(
    () => ({
      paddingBottom: Math.max(insets.bottom, minimumPadding),
    }),
    [insets.bottom, minimumPadding],
  );

  return <Box style={[paddingStyle, style]}>{children}</Box>;
};
