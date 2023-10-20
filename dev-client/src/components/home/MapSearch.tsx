import Autocomplete from 'react-native-autocomplete-input';
import {useCallback, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Box, HStack, Input, Pressable, Text, View, VStack} from 'native-base';
import {
  Suggestion,
  initMapSearch,
} from 'terraso-mobile-client/components/home/mapSearchTools';
import {Icon, IconButton} from 'terraso-mobile-client/components/common/Icons';
import {Keyboard} from 'react-native';
import {Coords} from 'terraso-mobile-client/model/map/mapSlice';

const {getSuggestions, retrieveFeature} = initMapSearch();

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
      <VStack>
        <Text>{name}</Text>
        <Text>{address}</Text>
      </VStack>
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
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [, setAbortController] = useState<AbortController | null>(null);
  const [hideResults, setHideResults] = useState(false);

  async function makeSuggestionsApiCall(queryText: string) {
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
  }

  async function querySuggestions(queryText: string) {
    if (queryText.length >= 2) {
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

  const selectQuery = (name: string, mapboxId: string) => {
    setQuery(name);
    setHideResults(true);
    if (zoomTo) {
      lookupFeature(mapboxId);
    }
    // close keyboard
    Keyboard.dismiss();
  };

  const clearQuery = () => {
    setQuery('');
    setHideResults(true);
  };

  async function lookupFeature(mapboxId: string) {
    let {features} = await retrieveFeature(mapboxId);
    // TODO: For now we are just going to zoom to the first feature
    // Should see what the best way to do this is
    if (zoomTo) {
      zoomTo(features[0]?.properties?.coordinates);
    }
  }

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
      <HStack space={3} pointerEvents="box-none">
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
              <Input
                borderRadius={10}
                bgColor="white"
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
                InputLeftElement={<Icon ml={3} name="search" size="md" />}
                InputRightElement={
                  query.length > 0 ? (
                    <Icon mr={3} name="close" size="sm" onPress={clearQuery} />
                  ) : undefined
                }
              />
            )}
          />
        </View>
        <VStack space={3}>
          <IconButton
            name="layers"
            _icon={{
              color: 'action.active',
            }}
            bgColor="white"
            padding={2}
            onPress={toggleMapLayer}
          />
          <IconButton
            name="my-location"
            _icon={{color: 'action.active'}}
            bgColor="white"
            padding={2}
            borderRadius={15}
            onPress={zoomToUser}
          />
        </VStack>
      </HStack>
    </Box>
  );
}
