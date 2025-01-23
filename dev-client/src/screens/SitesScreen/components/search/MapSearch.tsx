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

import {IconButton} from 'terraso-mobile-client/components/buttons/icons/IconButton';
import {searchBarStyles} from 'terraso-mobile-client/components/ListFilter';
import {UpdatedPermissionsRequestWrapper} from 'terraso-mobile-client/components/modals/PermissionsRequestWrapper';
import {
  Box,
  Column,
  Row,
  View,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {MAP_QUERY_MIN_LENGTH} from 'terraso-mobile-client/constants';
import {useSitesScreenContext} from 'terraso-mobile-client/context/SitesScreenContext';
import {useUpdatedForegroundPermissions} from 'terraso-mobile-client/hooks/appPermissionsHooks';
import {useIsOffline} from 'terraso-mobile-client/hooks/connectivityHooks';
import {useMapSuggestions} from 'terraso-mobile-client/hooks/useMapSuggestions';
import {MapSearchOfflineAlertBox} from 'terraso-mobile-client/screens/SitesScreen/components/search/MapSearchOfflineAlertBox';
import {MapSearchSuggestionBox} from 'terraso-mobile-client/screens/SitesScreen/components/search/MapSearchSuggestionBox';
import {Suggestion} from 'terraso-mobile-client/services/mapSearchService';

type Props = {
  zoomTo?: (site: Coords) => void;
  zoomToUser?: () => void;
  toggleMapLayer?: () => void;
};

const ShowAutocompleteContext = createContext(false);

export const MapSearchInput = ({value, ...props}: TextInputProps) => {
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
      />
      {isOffline && showAutocomplete ? <MapSearchOfflineAlertBox /> : <></>}
    </>
  );
};

export const MapSearch = ({zoomTo, zoomToUser, toggleMapLayer}: Props) => {
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

  const selectQuery = useCallback(
    (name: string, mapboxId: string) => {
      setQuery(name);
      setShowAutocomplete(false);
      lookupFeature(mapboxId);
      Keyboard.dismiss();
    },
    [lookupFeature],
  );

  const flatListProps: AutocompleteInputProps<Suggestion>['flatListProps'] =
    useMemo(
      () => ({
        keyboardShouldPersistTaps: 'always',
        keyExtractor: suggestion => suggestion.mapbox_id,
        renderItem: ({item}) => (
          <MapSearchSuggestionBox
            name={item.name}
            address={item.place_formatted}
            mapboxId={item.mapbox_id}
            onPress={selectQuery}
          />
        ),
      }),
      [selectQuery],
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
    <Box
      flex={1}
      left={0}
      position="absolute"
      right={0}
      top={0}
      zIndex={1}
      px={3}
      py={3}
      pointerEvents="box-none">
      <Row space={3} pointerEvents="box-none">
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
        <Column space={3}>
          <IconButton
            name="layers"
            variant="light-filled"
            type="md"
            onPress={toggleMapLayer}
          />
          <UpdatedPermissionsRequestWrapper
            requestModalTitle={t('permissions.location_title')}
            requestModalBody={t('permissions.location_body')}
            permissionHook={useUpdatedForegroundPermissions}
            permissionedAction={zoomToUser}>
            {onRequest => (
              <IconButton
                name="my-location"
                variant="light-filled"
                type="md"
                onPress={onRequest}
              />
            )}
          </UpdatedPermissionsRequestWrapper>
        </Column>
      </Row>
    </Box>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    borderWidth: 0,
  },
});
