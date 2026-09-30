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

import {useReducedMotion} from 'react-native-reanimated';

import {useIsFocused} from '@react-navigation/native';

/* Enough to catch the eye on arrival without becoming ambient motion the user has to sit with. Pair with the hook so every nudge is equally insistent. */
export const CYCLES_PER_VISIT = 3;

/*
 * Whether an attention-getting animation should run: until the user has seen the thing it
 * advertises, re-arming on each visit to the screen so the cycle count restarts.
 *
 * Takes `seen` as an input rather than reading storage itself, so a nudge can be driven
 * by anything — a stored record, a feature flag, a server value.
 *
 * Requires a navigation context for the focus check, so callers (and their tests) must
 * render inside a navigator.
 */
export const useNudgeWhileUnseen = (seen: boolean) => {
  const reducedMotion = useReducedMotion();
  const isFocused = useIsFocused();

  return isFocused && !seen && !reducedMotion;
};
