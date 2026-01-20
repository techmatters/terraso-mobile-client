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

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {useTranslation} from 'react-i18next';
import {Keyboard, StyleSheet, TextInputProps} from 'react-native';
import Autocomplete, {
  AutocompleteInputProps,
} from 'react-native-autocomplete-input';
import {Searchbar} from 'react-native-paper';

import {Coords} from 'terraso-client-shared/types';

import {searchBarStyles} from 'terraso-mobile-client/components/ListFilter';
import {View} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {MAP_QUERY_MIN_LENGTH} from 'terraso-mobile-client/constants';
import {useSitesScreenContext} from 'terraso-mobile-client/context/SitesScreenContext';
import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {useMapSuggestions} from 'terraso-mobile-client/hooks/useMapSuggestions';
import {MapSearchOfflineAlertBox} from 'terraso-mobile-client/screens/SitesScreen/components/search/MapSearchOfflineAlertBox';
import {
  CoordsSuggestionBox,
  MapboxSuggestionBox,
} from 'terraso-mobile-client/screens/SitesScreen/components/search/MapSearchSuggestionBox';
import {MapSuggestion} from 'terraso-mobile-client/services/mapSearchService';

const ShowAutocompleteContext = createContext(false);

const MapSearchInput = ({value, ...props}: TextInputProps) => {
  const isOffline = useIsOffline();
  const showAutocomplete = useContext(ShowAutocompleteContext);

  return (
    <>
      <Searchbar
        {...props}
        style={{
          ...searchBarStyles.search,
          ...searchBarStyles.wideSearchOverride,
        }}
        inputStyle={searchBarStyles.input}
        value={value ?? ''}
        testID="MAP_SEARCH_INPUT"
      />
      {isOffline && showAutocomplete ? <MapSearchOfflineAlertBox /> : <></>}
    </>
  );
};

type MapSearchProps = {
  zoomTo?: (coords: Coords) => void;
};
export const MapSearch = ({zoomTo}: MapSearchProps) => {
  const isOffline = useIsOffline();
  const {t} = useTranslation();
  const [query, setQuery] = useState('');
  const {coords, suggestions, querySuggestions, lookupFeature} =
    useMapSuggestions();
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const sitesScreen = useSitesScreenContext();

  useEffect(() => {
    if (query.length >= MAP_QUERY_MIN_LENGTH) {
      sitesScreen?.collapseBottomSheet();
    }
  }, [sitesScreen, query]);

  useEffect(() => {
    if (zoomTo && coords) {
      zoomTo(coords);
    }
  }, [zoomTo, coords]);

  const selectMapboxSuggestion = useCallback(
    (name: string, mapboxId: string) => {
      setQuery(name);
      setShowAutocomplete(false);
      lookupFeature(mapboxId);
      Keyboard.dismiss();
    },
    [lookupFeature],
  );

  const selectCoordsSuggestion = useCallback(
    (selectedCoords: Coords) => {
      setQuery(`${selectedCoords.latitude}, ${selectedCoords.longitude}`);
      setShowAutocomplete(false);
      if (zoomTo) {
        zoomTo(selectedCoords);
      }
      Keyboard.dismiss();
    },
    [zoomTo],
  );

  const flatListProps: AutocompleteInputProps<MapSuggestion>['flatListProps'] =
    useMemo(
      () => ({
        keyboardShouldPersistTaps: 'always',
        keyExtractor: suggestion =>
          suggestion.kind === 'coords' ? suggestion.name : suggestion.mapbox_id,
        renderItem: ({item}) =>
          item.kind === 'coords' ? (
            <CoordsSuggestionBox
              suggestion={item}
              onPress={selectCoordsSuggestion}
            />
          ) : (
            <MapboxSuggestionBox
              suggestion={item}
              onPress={selectMapboxSuggestion}
            />
          ),
      }),
      [selectMapboxSuggestion, selectCoordsSuggestion],
    );

  const onChangeText = useCallback(
    (newText: string) => {
      setQuery(newText);
      querySuggestions(newText);
    },
    [setQuery, querySuggestions],
  );

  const onFocus = useCallback(() => {
    setShowAutocomplete(true);
    querySuggestions(query);
  }, [query, setShowAutocomplete, querySuggestions]);

  const onEndEditing = useCallback(() => {
    setShowAutocomplete(false);
  }, [setShowAutocomplete]);

  return (
    <View flex={1} pointerEvents="box-none">
      <ShowAutocompleteContext.Provider value={showAutocomplete}>
        <Autocomplete
          data={suggestions}
          hideResults={!showAutocomplete || isOffline}
          flatListProps={flatListProps}
          inputContainerStyle={styles.inputContainer}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onEndEditing={onEndEditing}
          value={query}
          placeholder={t('search.placeholder')}
          renderTextInput={MapSearchInput}
        />
      </ShowAutocompleteContext.Provider>
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    borderWidth: 0,
  },
});
