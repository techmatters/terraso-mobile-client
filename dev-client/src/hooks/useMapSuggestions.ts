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

import {useCallback, useState} from 'react';

import {useDebouncedCallback} from 'use-debounce';

import {Coords} from 'terraso-client-shared/types';

import {MAP_QUERY_MIN_LENGTH} from 'terraso-mobile-client/constants';
import {
  initMapSearch,
  Suggestion,
} from 'terraso-mobile-client/services/mapSearchService';
import {isValidCoordinates} from 'terraso-mobile-client/util';

/*
 * Logic extracted from screens/HomeScreen/components/MapSearch.tsx; see its revisions
 * for history of original implementation / TODOs etc
 */

const {getSuggestions, retrieveFeature} = initMapSearch();

export const useMapSuggestions = () => {
  const [coords, setCoords] = useState<Coords | undefined>(undefined);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  /*
   * We use the AbortController API to cancel pending calls when new ones go out;
   * otherwise a stale async call could overwrite the results of a newer one if it
   * completes first.
   */
  const [, setAbortController] = useState<AbortController | null>(null);
  const makeSuggestionsApiCall = useCallback(async (queryText: string) => {
    const newAbortController = new AbortController();
    setAbortController(current => {
      if (current !== null) {
        current.abort();
      }
      return newAbortController;
    });
    const newSuggestions = await getSuggestions(
      queryText,
      newAbortController.signal,
    );
    setAbortController(null);
    return newSuggestions;
  }, []);

  const querySuggestions = useCallback(
    async (queryText: string) => {
      if (isValidCoordinates(queryText)) {
        const [latitude, longitude] = queryText.split(',').map(Number);
        setCoords({latitude, longitude});
        setSuggestions([]);
      } else {
        setCoords(undefined);
        if (queryText.length >= MAP_QUERY_MIN_LENGTH) {
          try {
            const {suggestions: newSuggestions} =
              await makeSuggestionsApiCall(queryText);
            setSuggestions(newSuggestions);
          } catch (e: any) {
            if (e.name !== 'AbortError') {
              throw e;
            }
          }
        } else if (queryText.length === 0) {
          setAbortController(current => {
            if (current !== null) {
              current.abort();
            }
            return null;
          });
          setSuggestions([]);
        }
      }
    },
    [makeSuggestionsApiCall],
  );
  const debouncedQuerySuggestions = useDebouncedCallback(querySuggestions, 500);

  const lookupFeature = useCallback(async (mapboxId: string) => {
    let {features} = await retrieveFeature(mapboxId);
    // TODO: For now we are just going to zoom to the first feature
    // Should see what the best way to do this is
    setCoords(features[0]?.properties?.coordinates);
  }, []);

  return {
    coords,
    suggestions,
    querySuggestions: debouncedQuerySuggestions as (
      queryText: string,
    ) => Promise<void>,
    lookupFeature,
  };
};
