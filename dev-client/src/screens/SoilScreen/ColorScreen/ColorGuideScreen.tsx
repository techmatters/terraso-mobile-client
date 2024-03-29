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

import {Button} from 'native-base';
import {useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {Image, ScrollView, StyleSheet} from 'react-native';
import {BulletList} from 'terraso-mobile-client/components/BulletList';
import {Icon} from 'terraso-mobile-client/components/Icons';
import {ImagePicker, Photo} from 'terraso-mobile-client/components/ImagePicker';
import {
  Box,
  Column,
  Paragraph,
  Row,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {ScreenScaffold} from 'terraso-mobile-client/screens/ScreenScaffold';
import {SoilPitInputScreenProps} from 'terraso-mobile-client/screens/SoilScreen/components/SoilPitInputScreenScaffold';

export const ColorGuideScreen = (
  props: SoilPitInputScreenProps | undefined,
) => {
  const {t} = useTranslation();
  const navigation = useNavigation();

  const onGoBack = useCallback(() => navigation.pop(), [navigation]);
  const onTakePhoto = useCallback(
    (photo: Photo) => {
      navigation.replace('COLOR_ANALYSIS', {
        photo: photo,
        pitProps: props,
      });
    },
    [navigation, props],
  );

  const stepContent = [
    <>
      <BulletList
        data={[1, 2, 3, 4, 5]}
        renderItem={i => (
          <Text>{t(`soil.color.guide.step1.bullets.${i}`)}</Text>
        )}
      />
      <Box width="100%" alignItems="center">
        <Image
          source={require('terraso-mobile-client/assets/color/post-it.jpg')}
        />
      </Box>
    </>,
    <Row>
      <Box flex={1}>
        <Box width="100%" aspectRatio={1}>
          <Image
            resizeMode="contain"
            style={styles.image}
            source={require('terraso-mobile-client/assets/color/sieve.png')}
          />
        </Box>
      </Box>
      <Box width="md" />
      <Box flex={1}>
        <Box width="100%" aspectRatio={1}>
          <Image
            resizeMode="contain"
            style={styles.image}
            source={require('terraso-mobile-client/assets/color/flat-pile.png')}
          />
        </Box>
      </Box>
    </Row>,
    undefined,
    <Box width="100%">
      <Image
        source={require('terraso-mobile-client/assets/color/reference.jpg')}
      />
    </Box>,
    <Row justifyContent="space-between">
      <Button variant="link" onPress={onGoBack}>
        {t('soil.color.guide.go_back')}
      </Button>
      <ImagePicker onPick={onTakePhoto}>
        {onOpen => (
          <Button
            _text={{textTransform: 'uppercase'}}
            leftIcon={<Icon name="camera" />}
            onPress={onOpen}>
            {t('soil.color.guide.take_photo')}
          </Button>
        )}
      </ImagePicker>
    </Row>,
  ] satisfies React.ReactNode[];

  return (
    <ScreenScaffold>
      <ScrollView>
        <Column backgroundColor="grey.300" space="md">
          {stepContent.map((content, index) => (
            <Column backgroundColor="primary.contrast" key={index} padding="md">
              <Text variant="body1-strong">
                {t(`soil.color.guide.step${index + 1}.title`)}
              </Text>
              <Paragraph variant="body1">
                {t(`soil.color.guide.step${index + 1}.content`)}
              </Paragraph>
              {content}
            </Column>
          ))}
        </Column>
      </ScrollView>
    </ScreenScaffold>
  );
};

const styles = StyleSheet.create({
  image: {width: '100%', height: '100%'},
});
