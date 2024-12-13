/*
 * Copyright © 2024 Technology Matters
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

import {useCallback, useMemo, useRef, useState} from 'react';

import {isEqual, uniqWith} from 'lodash';

export type ValueSet<T> = {
  values: T[];
  add: (value: T) => {remove: () => void};
};

/**
 * Utility hook for tracking sets of unique input values. Allows components or contexts to
 * expose the add() method to their children to use in side-effects, which then allow the parent
 * to track all added values to take some action with them. The values are returned to the hook
 * caller after being passed through a structural uniqueness filter.
 */
export const useValueSet = <T>(): ValueSet<T> => {
  /*
   * We track active values with unique references for each add call.
   * The ref here always holds the most recent contents; when it is updated, changes are propagated
   * changes to it are propagated to a React state which allows re-renders when subscriptions
   * change.
   */
  const valuesRef = useRef(new Set<{value: T}>());
  const [valuesState, setValuesState] = useState(new Set(valuesRef.current));
  const add = useCallback(
    (value: T) => {
      const container = {value};
      valuesRef.current.add(container);
      setValuesState(new Set(valuesRef.current));
      return {
        remove: () => {
          valuesRef.current.delete(container);
          setValuesState(new Set(valuesRef.current));
        },
      };
    },
    [valuesRef, setValuesState],
  );

  /* Condense all values based on structural equality */
  const values = useMemo(
    () =>
      uniqWith(
        Array.from(valuesState).map(i => i.value),
        isEqual,
      ),
    [valuesState],
  );

  return {values, add};
};
