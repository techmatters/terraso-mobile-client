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
import {Image} from 'native-base';
import {
  Paragraph,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

export const SlopeShapeInfoContent = () => {
  const {t} = useTranslation();

  return (
    <>
      <Paragraph variant="body1">
        {t('slope.shape.info.description1')}
      </Paragraph>
      <Paragraph variant="body1">
        <Trans i18nKey="slope.shape.info.description2">
          <Text bold>first</Text>
          <Text>second</Text>
          <Text bold>third</Text>
        </Trans>
      </Paragraph>
      <Paragraph variant="body1">
        {t('slope.shape.info.description3')}
      </Paragraph>
      <Paragraph variant="body1">
        <Trans i18nKey="slope.shape.info.description4">
          <Text bold>first</Text>
          <Text>second</Text>
        </Trans>
      </Paragraph>
      <Paragraph variant="body1">
        {t('slope.shape.info.description5')}
      </Paragraph>
      <Paragraph variant="body1">
        <Trans i18nKey="slope.shape.info.description6">
          <Text bold>first</Text>
          <Text>second</Text>
        </Trans>
      </Paragraph>
      <Paragraph variant="body1">
        {t('slope.shape.info.description7')}
      </Paragraph>
      <Paragraph variant="body1">
        <Trans i18nKey="slope.shape.info.description8">
          <Text bold>first</Text>
          <Text>second</Text>
        </Trans>
      </Paragraph>
      <Paragraph variant="body1">
        <Trans i18nKey="slope.shape.info.description9">
          <Text bold>first</Text>
          <Text>second</Text>
        </Trans>
      </Paragraph>
      <Image
        source={require('terraso-mobile-client/assets/landpks_intro_image.png')}
        resizeMode="contain"
        w="25%"
        alignSelf="center"
        alt={t('home.info.intro_image_alt')}
      />
      <Paragraph variant="body1">
        <Trans i18nKey="slope.shape.info.description10">
          <Text bold>first</Text>
          <Text>second</Text>
        </Trans>
      </Paragraph>
    </>
  );
};
