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

export type TypePresetValues = {
  keyboardType: RNTextInputProps['keyboardType'];
  autoCapitalize: RNTextInputProps['autoCapitalize'];
  autoComplete?: RNTextInputProps['autoComplete'];
};

/* `type` bundles the keyboard / capitalization / autoComplete trio so callers
 * don't have to set all three for common cases (and so they can't forget one). */
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

/* Validation runs continuously through Formik (so `isValid` stays accurate for
 * the submit button); this rule gates *display* of the error. We wait until
 * the user has blurred the field once, or tried to submit to avoid yelling at
 * users mid-keystroke. */
export const shouldShowError = (
  error: string | undefined,
  touched: boolean,
  submitCount: number,
): boolean => {
  if (!error) return false;
  return touched || submitCount > 0;
};
