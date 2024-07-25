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
