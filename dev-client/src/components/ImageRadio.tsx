import {Box, Row, Text, useToken} from 'native-base';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  View,
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

  return (
    <Row p="18px" flexWrap="wrap" justifyContent="space-between">
      {Object.entries<Option>(options).flatMap(
        ([optionValue, {label, image}], index) => [
          <Pressable
            key={optionValue}
            style={[
              styles.pressable,
              {
                backgroundColor: value === optionValue ? bg : undefined,
              },
            ]}
            onPress={() => onChange(optionValue as Value)}>
            <View style={styles.imageContainer}>
              <Image resizeMode="contain" style={styles.image} source={image} />
            </View>
            <Text
              variant="body1"
              fontWeight={value === optionValue ? 700 : undefined}>
              {label}
            </Text>
          </Pressable>,
          index % 2 === 0 && (
            <Box
              key={`${optionValue}-spacer`}
              ml="20px"
              flexGrow={index === Object.entries(options).length - 1 ? 1 : 0}
              width={index === Object.entries(options).length - 1 ? '40%' : 0}
            />
          ),
        ],
      )}
    </Row>
  );
};

const styles = StyleSheet.create({
  pressable: {
    maxWidth: 175,
    flexGrow: 1,
    alignItems: 'center',
    padding: 10,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: '1/1',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
