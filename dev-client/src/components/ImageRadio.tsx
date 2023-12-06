import {Box, Column, Row, Text} from 'native-base';
import {Image, ImageSourcePropType, Pressable} from 'react-native';

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
  return (
    <Row p="18px" flexWrap="wrap" justifyContent="space-between">
      {Object.entries<Option>(options).flatMap(
        ([optionValue, {label, image}], index) => [
          <Pressable
            key={optionValue}
            style={{width: '40%', flexGrow: 1}}
            onPress={() => onChange(optionValue as Value)}>
            <Column
              alignItems="center"
              p="10px"
              bg={value === optionValue ? 'primary.lighter' : undefined}>
              <Image
                resizeMode="contain"
                style={{width: '100%', height: 120}}
                source={image}
              />
              <Text
                variant="body1"
                fontWeight={value === optionValue ? 700 : undefined}>
                {label}
              </Text>
            </Column>
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
