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

import {Text, useToken} from 'native-base';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

type Option = {
  label: string;
  image: ImageSourcePropType;
};
type Props<Value extends string> = {
  value: Value | null | undefined;
  options: Record<Value, Option>;
  onChange: (value: Value | null) => void;
};

export const ImageRadio = <Value extends string>({
  value,
  options,
  onChange,
}: Props<Value>) => {
  const bg = useToken('colors', 'primary.lighter');
  const {width} = useWindowDimensions();

  return (
    <View style={styles.container}>
      {Object.entries<Option>(options).map(([optionValue, {label, image}]) => (
        <Pressable
          key={optionValue}
          style={[
            styles.gridElem,
            styles.radioOption,
            {
              backgroundColor: value === optionValue ? bg : undefined,
              flexBasis: width / 3,
            },
          ]}
          onPress={() => onChange(optionValue as Value)}>
          <View style={styles.imageContainer}>
            <Image resizeMode="contain" style={styles.image} source={image} />
          </View>
          <Text
            variant="body1"
            textAlign="center"
            fontWeight={value === optionValue ? 700 : undefined}>
            {label}
          </Text>
        </Pressable>
      ))}
      {Object.keys(options).map((_, index) => (
        <View
          key={`spacer-${index}`}
          style={[styles.gridElem, {flexBasis: width / 3}]}
        />
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
    borderColor: 'black',
    borderWidth: 2,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
