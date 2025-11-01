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

import {IScrollViewProps} from 'native-base';

import {SafeScrollView} from 'terraso-mobile-client/components/safeview/SafeScrollView';
import {SAFE_AREA_BOTTOM_PADDING_WITH_FAB} from 'terraso-mobile-client/constants/safeArea';

/**
 * A specialized SafeScrollView with extra bottom padding for screens that have a FAB
 * (Floating Action Button) positioned at the bottom.
 *
 * This variant uses SAFE_AREA_BOTTOM_PADDING_WITH_FAB (100px) to ensure content can
 * scroll clear of the FAB button, which is absolutely positioned and overlays content.
 *
 * Use this instead of SafeScrollView when your screen has a FAB button.
 * For screens without bottom action buttons, use the base SafeScrollView.
 *
 * @example
 * <SafeScrollViewWithFab>
 *   <Text>Scrollable content</Text>
 * </SafeScrollViewWithFab>
 * <Fab label="Save" onPress={handleSave} />
 */
export const SafeScrollViewWithFab = (props: IScrollViewProps) => (
  <SafeScrollView
    minimumPadding={SAFE_AREA_BOTTOM_PADDING_WITH_FAB}
    {...props}
  />
);
