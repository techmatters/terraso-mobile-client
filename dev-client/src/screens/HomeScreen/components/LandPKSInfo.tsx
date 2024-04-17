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

import {Linking} from 'react-native';
import {Image} from 'native-base';
import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import {Trans, useTranslation} from 'react-i18next';
import {
  LocationIcon,
  LinkNewWindowIcon,
} from 'terraso-mobile-client/components/Icons';
import {
  Column,
  HStack,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {Text} from 'terraso-mobile-client/components/core/Text';

export const LandPKSInfo = () => {
  const {t} = useTranslation();

  return (
    <BottomSheetScrollView>
      <Column space={3} pb="65%" pt={5} px={5} mt="48px">
        <Text width="full" textAlign="center" variant="body1">
          {t('home.info.title')}
        </Text>
        <Image
          source={require('terraso-mobile-client/assets/landpks_intro_image.png')}
          w="100%"
          h="25%"
          resizeMode="contain"
          alt={t('home.info.intro_image_alt')}
        />
        <Text variant="body1">
          <Trans i18nKey="home.info.description">
            <Text variant="body1-strong">first</Text>
            <Text variant="body1">second</Text>
            <Text variant="body1-strong">third</Text>
          </Trans>
        </Text>
        <Column>
          {[1, 2, 3].map(index => (
            <HStack key={index}>
              <Text variant="body1" marginRight={2}>
                {index + 1}
                {'.'}
              </Text>
              <Text variant="body1" marginRight={2}>
                <Trans
                  i18nKey={`home.info.list${index}`}
                  components={{icon: <LocationIcon />}}
                />
              </Text>
            </HStack>
          ))}
        </Column>
        <Text variant="body1">
          <Trans
            i18nKey="home.info.description2"
            components={{
              icon: <LinkNewWindowIcon />,
            }}>
            <Text variant="body1-strong">first</Text>
            <Text
              underline
              onPress={() => Linking.openURL(t('home.info.link_url'))}
              color="primary.main"
              variant="body1">
              link_text
            </Text>
          </Trans>
        </Text>
      </Column>
    </BottomSheetScrollView>
  );
};
