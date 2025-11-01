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

/**
 * Safe area bottom padding constants for different UI scenarios.
 * These values ensure content is not obscured by Android soft navigation buttons.
 * Uses Math.max(insets.bottom, constant) to handle both devices with and without soft buttons.
 */

/**
 * Default minimum bottom padding for screens without action buttons at the bottom.
 * Provides basic clearance from device safe area insets.
 * Use for: General scrollable content, list screens, informational screens.
 */
export const SAFE_AREA_BOTTOM_PADDING_DEFAULT = 16;

/**
 * Bottom padding for screens with button rows (e.g., Delete/Done button pairs).
 * Accounts for large button height (~48-56px) + spacing + comfortable scrolling clearance.
 * Use for: Form screens with button rows, dialogs with action buttons at bottom.
 */
export const SAFE_AREA_BOTTOM_PADDING_WITH_BUTTONS = 100;

/**
 * Bottom padding for screens with FAB (Floating Action Button).
 * Accounts for FAB button height (56px) + margin (16px) + extra clearance for comfortable interaction.
 * Use for: Screens with absolutely positioned FAB buttons that overlay content.
 */
export const SAFE_AREA_BOTTOM_PADDING_WITH_FAB = 100;
