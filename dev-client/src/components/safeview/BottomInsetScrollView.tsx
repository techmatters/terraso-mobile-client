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
import {ScrollView, ScrollViewProps, StyleSheet} from 'react-native';

import {useBottomInsetPadding} from 'terraso-mobile-client/hooks/useBottomInsetPadding';

type Props = ScrollViewProps & {
  /* Floor applied when the device reports no bottom inset. */
  minimumPadding?: number;
};

/**
 * ScrollView whose content is padded clear of the bottom safe area, so the tail
 * of long content is not hidden under the Android nav bar or the home indicator.
 *
 * Built on react-native's ScrollView rather than native-base's, so it needs no
 * theme provider and can be unit-tested standalone. It is the successor to
 * SafeScrollView; prefer it for new code.
 *
 * The inset padding is applied ahead of contentContainerStyle, so a caller that
 * needs a different value just sets paddingBottom itself — there is no opt-out flag.
 */
export const BottomInsetScrollView = ({
  minimumPadding,
  contentContainerStyle,
  ...props
}: Props) => {
  const insetPadding = useBottomInsetPadding(minimumPadding);

  /* Flattened rather than passed as an array so the resolved padding is legible in the element tree and in tests. */
  const contentStyle = useMemo(
    () => StyleSheet.flatten([insetPadding, contentContainerStyle]),
    [insetPadding, contentContainerStyle],
  );

  return <ScrollView {...props} contentContainerStyle={contentStyle} />;
};
