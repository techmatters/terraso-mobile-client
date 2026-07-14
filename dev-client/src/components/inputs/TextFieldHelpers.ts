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

import type {TextInputProps as RNTextInputProps} from 'react-native';

/* Pure helpers and shared types for TextField / FormTextField. Kept here so
 * the rules can be unit-tested in isolation without rendering or context. */

export type TextFieldType = 'text' | 'email' | 'numeric';

/* When TextField surfaces an `error` string:
 *   - 'afterFirstFocus': after the user first focuses the field (default UX)
 *   - 'immediate': as soon as `error` is set (may be on first viewing).
 *      FormTextField forces 'immediate' after submit so backend errors surface
 *      without focus. */
export type ErrorTiming = 'afterFirstFocus' | 'immediate';

export type TypePresetValues = {
  keyboardType: RNTextInputProps['keyboardType'];
  autoCapitalize: RNTextInputProps['autoCapitalize'];
  autoComplete?: RNTextInputProps['autoComplete'];
};

/* `type` bundles the keyboard / capitalization / autoComplete trio so callers
 * don't have to set all three for common cases (and so they can't forget one).
 *
 * FYI: Some iOS devices may not display the same keyboard layout. For example,
 * 'numeric' displayed a more extensive keyboard on Courtney's ipad
 */
export const TYPE_PRESETS: Record<TextFieldType, TypePresetValues> = {
  text: {
    keyboardType: 'default',
    autoCapitalize: 'sentences',
  },
  email: {
    keyboardType: 'email-address',
    autoCapitalize: 'none',
    autoComplete: 'email',
  },
  numeric: {
    keyboardType: 'numeric',
    autoCapitalize: 'none',
  },
};

/* Gate the *display* of an error. Validation runs continuously (so `isValid`
 * stays accurate for submit buttons); this just decides when to surface it.
 * FormTextField forces 'immediate' once submitCount>0 so post-submit errors
 * (e.g., backend errors) surface even on fields the user never focused. */
export const shouldShowError = (
  error: string | undefined,
  hasBeenFocused: boolean,
  errorTiming: ErrorTiming,
): boolean => {
  if (!error) return false;
  return errorTiming === 'immediate' || hasBeenFocused;
};
