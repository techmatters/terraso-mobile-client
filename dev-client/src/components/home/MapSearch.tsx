import Autocomplete from 'react-native-autocomplete-input';
import {useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {TouchableOpacity} from 'react-native';
import {Box, Container, Input, Text} from 'native-base';

export default function MapSearch() {
  const {t} = useTranslation();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hideResults, setHideResults] = useState(false);
  const suggestions = ['Toronto', 'Montréal', 'Vancouver', 'Calgary'];
  const validSuggestions = useMemo(() => {
    return query.length > 1
      ? suggestions.filter(sug => sug.includes(query))
      : [];
  }, [query]);
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
        data={validSuggestions}
        hideResults={hideResults}
        flatListProps={{
          keyExtractor: suggestion => suggestion,
          renderItem: ({item}) => (
            <TouchableOpacity
              onPress={() => {
                setQuery(item);
                setHideResults(true);
              }}>
              <Text>{item}</Text>
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
            }}
            editable={!isLoading}
            value={query}
            placeholder={t('search.placeholder')}
          />
        )}
      />
    </Box>
  );
}
