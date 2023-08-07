import Autocomplete from 'react-native-autocomplete-input';
import {useEffect, useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {TouchableOpacity} from 'react-native';
import {Box, Input, Text} from 'native-base';
import {Suggestion, initMapSearch} from './mapSearch';
import {Location} from '@rnmapbox/maps';

const {getSuggestions, retrieveFeature} = initMapSearch();

type Props = {
  zoomTo?: (coords: Location['coords']) => void;
};

export default function MapSearch({zoomTo}: Props) {
  const {t} = useTranslation();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  //const [isLoading, setIsLoading] = useState(false);
  const [hideResults, setHideResults] = useState(false);

  async function querySuggestions() {
    if (query.length > 2) {
      const {suggestions: newSuggestions} = await getSuggestions(query);

      setSuggestions(newSuggestions);
    }
  }

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
      py={3}>
      <Autocomplete
        data={suggestions}
        hideResults={hideResults}
        flatListProps={{
          keyExtractor: suggestion => suggestion.mapbox_id,
          renderItem: ({item}) => (
            <TouchableOpacity
              onPress={() => {
                setQuery(item.name);
                setHideResults(true);
                if (zoomTo) {
                  lookupFeature(item.mapbox_id);
                }
              }}>
              <Text>{item.name}</Text>
            </TouchableOpacity>
          ),
        }}
        inputContainerStyle={{borderWidth: 0}}
        renderTextInput={() => (
          <Input
            borderRadius={10}
            bgColor="white"
            onChangeText={newText => {
              setQuery(newText);
              setHideResults(false);
              querySuggestions();
            }}
            value={query}
            placeholder={t('search.placeholder')}
          />
        )}
      />
    </Box>
  );
}
