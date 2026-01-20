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

import {useCallback} from 'react';

import {Pressable} from 'native-base';

import {Coords} from 'terraso-client-shared/types';

import {
  Column,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {
  CoordinateSuggestion,
  MapboxSuggestion,
} from 'terraso-mobile-client/services/mapSearchService';

type MapboxSuggestionBoxProps = {
  suggestion: MapboxSuggestion;
  onPress: (name: string, mapboxId: string) => void;
};

export const MapboxSuggestionBox = ({
  suggestion,
  onPress,
}: MapboxSuggestionBoxProps) => {
  const handlePress = useCallback(
    () => onPress(suggestion.name, suggestion.mapbox_id),
    [suggestion.name, suggestion.mapbox_id, onPress],
  );

  return (
    <Pressable w="100%" py={1} px={3} onPress={handlePress}>
      <Column>
        <Text>{suggestion.name}</Text>
        <Text>{suggestion.place_formatted}</Text>
      </Column>
    </Pressable>
  );
};

type CoordsSuggestionBoxProps = {
  suggestion: CoordinateSuggestion;
  onPress: (coords: Coords) => void;
};

export const CoordsSuggestionBox = ({
  suggestion,
  onPress,
}: CoordsSuggestionBoxProps) => {
  const handlePress = useCallback(
    () => onPress(suggestion.coords),
    [suggestion.coords, onPress],
  );

  return (
    <Pressable w="100%" py={1} px={3} onPress={handlePress}>
      <Column>
        <Text>{suggestion.name}</Text>
      </Column>
    </Pressable>
  );
};
