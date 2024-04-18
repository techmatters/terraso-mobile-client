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
import {Trans, useTranslation} from 'react-i18next';
import {Image, ImageSourcePropType, StyleSheet, View} from 'react-native';
import {
  Box,
  Column,
  Heading,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

type ImageProps = {
  label: string;
  imageSource: ImageSourcePropType;
};

const SlopeShapeImage = ({label, imageSource}: ImageProps) => {
  const {t} = useTranslation();
  return (
    <Box style={styles.imageAndLabelContainer}>
      <View style={styles.imageContainer}>
        <Image style={styles.image} source={imageSource} resizeMode="contain" />
      </View>
      <Text style={styles.label}>{t(label)}</Text>
    </Box>
  );
};

const SlopeShapeImagery = () => {
  const {t} = useTranslation();
  return (
    <Row>
      <Column flex={1}>
        <Heading variant="h6" alignSelf="center">
          {t('slope.shape.info.down_slope')}
        </Heading>
        <SlopeShapeImage
          label="slope.shape.info.concave"
          imageSource={require('terraso-mobile-client/assets/slope/shape/info/downSlope-concave.png')}
        />
        <SlopeShapeImage
          label="slope.shape.info.convex"
          imageSource={require('terraso-mobile-client/assets/slope/shape/info/downSlope-convex.png')}
        />
        <SlopeShapeImage
          label="slope.shape.info.linear"
          imageSource={require('terraso-mobile-client/assets/slope/shape/info/downSlope-linear.png')}
        />
      </Column>
      <Column flex={1}>
        <Heading variant="h6" alignSelf="center">
          {t('slope.shape.info.cross_slope')}
        </Heading>
        <SlopeShapeImage
          label="slope.shape.info.concave"
          imageSource={require('terraso-mobile-client/assets/slope/shape/info/crossSlope-concave.png')}
        />
        <SlopeShapeImage
          label="slope.shape.info.convex"
          imageSource={require('terraso-mobile-client/assets/slope/shape/info/crossSlope-convex.png')}
        />
        <SlopeShapeImage
          label="slope.shape.info.linear"
          imageSource={require('terraso-mobile-client/assets/slope/shape/info/crossSlope-linear.png')}
        />
      </Column>
    </Row>
  );
};

export const SlopeShapeInfoContent = () => {
  return (
    <Column>
      <Text>
        <Trans
          i18nKey="slope.shape.info.description"
          values={{units: 'METRIC'}}
          components={{
            bold: <Text bold />,
          }}
        />
      </Text>
      <Box height="18px" />
      <SlopeShapeImagery />
    </Column>
  );
};

const styles = StyleSheet.create({
  imageAndLabelContainer: {
    marginHorizontal: 16,
    marginVertical: 8,
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
    resizeMode: 'contain',
  },
  label: {
    alignSelf: 'center',
  },
});
