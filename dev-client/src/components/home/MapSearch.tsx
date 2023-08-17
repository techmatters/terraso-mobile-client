import Autocomplete from 'react-native-autocomplete-input';
import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Box, HStack, Input, Pressable, Text, VStack} from 'native-base';
import {Suggestion, initMapSearch} from './mapSearch';
import {Location} from '@rnmapbox/maps';
import {Icon, IconButton} from '../common/Icons';

const {getSuggestions, retrieveFeature} = initMapSearch();

type Props = {
  zoomTo?: (coords: Location['coords']) => void;
  zoomToUser?: () => void;
};

export default function MapSearch({zoomTo, zoomToUser}: Props) {
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
      <HStack space={3}>
        <Autocomplete
          data={suggestions}
          hideResults={hideResults}
          flatListProps={{
            keyExtractor: suggestion => suggestion.mapbox_id,
            renderItem: ({item}) => (
              <Pressable
                width="100%"
                onPress={() => {
                  setQuery(item.name);
                  setHideResults(true);
                  if (zoomTo) {
                    lookupFeature(item.mapbox_id);
                  }
                }}>
                <Text>{item.name}</Text>
              </Pressable>
            ),
          }}
          inputContainerStyle={{borderWidth: 0}} // eslint-disable-line react-native/no-inline-styles
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
              InputLeftElement={<Icon ml={3} name="search" size="md" />}
            />
          )}
        />
        <VStack space={3}>
          <IconButton
            name="layers"
            _icon={{
              color: 'action.active',
            }}
            bgColor="white"
            padding={2}
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
