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

import {Pressable, StyleSheet, View} from 'react-native';

import {useToken} from 'native-base';

import {Text} from 'terraso-mobile-client/components/NativeBaseAdapters';

export type ImageRadioOption = {
  label: string | undefined;
  image: React.ReactNode;
};
type Props<Value extends string> = {
  value: Value | null | undefined;
  options: Record<Value, ImageRadioOption>;
  onChange: (value: Value | null) => void;
  minimumPerRow: number;
};

export const ImageRadio = <Value extends string>({
  value,
  options,
  onChange,
  minimumPerRow,
}: Props<Value>) => {
  const bg = useToken('colors', 'primary.lighter');
  const flexBasis = `${100 / (minimumPerRow + 1)}%` as const;

  return (
    <View style={styles.container}>
      {Object.entries<ImageRadioOption>(options).map(
        ([optionValue, {label, image}]) => (
          <Pressable
            key={optionValue}
            style={[
              styles.gridElem,
              styles.radioOption,
              {
                backgroundColor: value === optionValue ? bg : undefined,
                flexBasis,
              },
            ]}
            onPress={() =>
              onChange(value === optionValue ? null : (optionValue as Value))
            }>
            <View style={styles.imageContainer}>{image}</View>
            <Text
              variant="body1"
              textAlign="center"
              fontWeight={value === optionValue ? 700 : undefined}>
              {label}
            </Text>
          </Pressable>
        ),
      )}
      {Object.keys(options).map((_, index) => (
        <View key={`spacer-${index}`} style={[styles.gridElem, {flexBasis}]} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'flex-start',
    columnGap: 20,
    padding: 18,
  },
  gridElem: {
    maxWidth: 200,
    flexGrow: 1,
  },
  radioOption: {
    padding: 10,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: '1/1',
  },
  image: {
    width: '100%',
    height: '100%',
    borderColor: 'black',
    borderWidth: 2,
  },
});

export const radioImage = styles.image;
