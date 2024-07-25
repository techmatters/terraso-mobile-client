/*
 * Copyright © 2023 Technology Matters
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

import {useCallback, useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Keyboard} from 'react-native';
import Autocomplete from 'react-native-autocomplete-input';
import {Searchbar} from 'react-native-paper';

import {useForegroundPermissions} from 'expo-location';

import {Pressable} from 'native-base';

import {Coords} from 'terraso-client-shared/types';

import {IconButton} from 'terraso-mobile-client/components/icons/IconButton';
import {searchBarStyles} from 'terraso-mobile-client/components/ListFilter';
import {PermissionsRequestWrapper} from 'terraso-mobile-client/components/modals/PermissionsRequestWrapper';
import {
  Box,
  Column,
  Row,
  Text,
  View,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {MAP_QUERY_MIN_LENGTH} from 'terraso-mobile-client/constants';
import {useHomeScreenContext} from 'terraso-mobile-client/context/HomeScreenContext';
import {useMapSuggestions} from 'terraso-mobile-client/hooks/useMapSuggestions';

type SuggestionProps = {
  name: string;
  address: string;
  mapboxId: string;
  onPress: (name: string, mapboxId: string) => void;
};

function SuggestionBox({name, address, mapboxId, onPress}: SuggestionProps) {
  const selectSuggestion = useCallback(
    () => onPress(name, mapboxId),
    [name, mapboxId, onPress],
  );

  return (
    <Pressable w="100%" py={1} px={3} onPress={selectSuggestion}>
      <Column>
        <Text>{name}</Text>
        <Text>{address}</Text>
      </Column>
    </Pressable>
  );
}

type Props = {
  zoomTo?: (site: Coords) => void;
  zoomToUser?: () => void;
  toggleMapLayer?: () => void;
};

export default function MapSearch({zoomTo, zoomToUser, toggleMapLayer}: Props) {
  const {t} = useTranslation();
  const [query, setQuery] = useState('');
  const {coords, suggestions, querySuggestions, lookupFeature} =
    useMapSuggestions();
  const [hideResults, setHideResults] = useState(false);
  const homeScreen = useHomeScreenContext();

  useEffect(() => {
    if (query.length >= MAP_QUERY_MIN_LENGTH) {
      homeScreen?.collapseBottomSheet();
    }
  }, [homeScreen, query]);

  useEffect(() => {
    if (zoomTo && coords) {
      zoomTo(coords);
    }
  }, [zoomTo, coords]);

  const selectQuery = useCallback(
    (name: string, mapboxId: string) => {
      setQuery(name);
      setHideResults(true);
      lookupFeature(mapboxId);
      Keyboard.dismiss();
    },
    [lookupFeature],
  );

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
          <Autocomplete
            data={suggestions}
            hideResults={hideResults}
            flatListProps={{
              keyboardShouldPersistTaps: 'always',
              keyExtractor: suggestion => suggestion.mapbox_id,
              renderItem: ({item}) => (
                <SuggestionBox
                  name={item.name}
                  address={item.place_formatted}
                  mapboxId={item.mapbox_id}
                  onPress={selectQuery}
                />
              ),
            }}
            inputContainerStyle={{borderWidth: 0}} // eslint-disable-line react-native/no-inline-styles
            renderTextInput={() => (
              <Searchbar
                onChangeText={newText => {
                  setQuery(newText);
                  querySuggestions(newText);
                }}
                onFocus={() => {
                  setHideResults(false);
                  querySuggestions(query);
                }}
                onEndEditing={() => {
                  setHideResults(true);
                }}
                value={query}
                placeholder={t('search.placeholder')}
                style={{
                  ...searchBarStyles.search,
                  ...searchBarStyles.wideSearchOverride,
                }}
                inputStyle={searchBarStyles.input}
              />
            )}
          />
        </View>
        <Column space={3}>
          <IconButton
            name="layers"
            _icon={{
              color: 'action.active',
            }}
            bgColor="white"
            padding={2}
            onPress={toggleMapLayer}
          />
          <PermissionsRequestWrapper
            requestModalTitle={t('permissions.location_title')}
            requestModalBody={t('permissions.location_body')}
            permissionHook={useForegroundPermissions}
            permissionedAction={zoomToUser}>
            {onRequest => (
              <IconButton
                name="my-location"
                _icon={{color: 'action.active'}}
                bgColor="white"
                padding={2}
                borderRadius={15}
                onPress={onRequest}
              />
            )}
          </PermissionsRequestWrapper>
        </Column>
      </Row>
    </Box>
  );
}
