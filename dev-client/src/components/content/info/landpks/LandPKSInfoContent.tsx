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

import InfoSVG from 'terraso-mobile-client/assets/landpks_info_image.svg';
import {ExternalLink} from 'terraso-mobile-client/components/links/ExternalLink';
import {
  Box,
  Column,
  Heading,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {GetStartedMessage} from 'terraso-mobile-client/screens/SitesScreen/components/GetStartedMessage';

export const LandPKSInfoContent = () => {
  const {t} = useTranslation();

  return (
    <Column space={3} pb="65%" pt={5} px={5}>
      <Heading w="full" textAlign="center">
        {t('info.title')}
      </Heading>
      <Box width={157} height={128} alignSelf="center" mb={1}>
        <InfoSVG />
      </Box>
      <Text variant="body1">
        <Trans i18nKey="info.description">
          <Text bold>first</Text>
          <Text>second</Text>
          <Text bold>third</Text>
        </Trans>
      </Text>
      <Column>
        <Text variant="body1">
          <Trans
            i18nKey="info.get_started"
            components={{
              bold: <Text bold />,
            }}>
            <Text bold>first</Text>
          </Trans>
        </Text>
        <GetStartedMessage />
      </Column>
      <Text variant="body1">
        <Trans
          i18nKey="info.description2"
          components={{
            bold: <Text bold />,
            icon: (
              <ExternalLink
                label={t('info.link_label')}
                url={t('info.link_url')}
              />
            ),
          }}>
          <Text bold>first</Text>
        </Trans>
      </Text>
    </Column>
  );
};
