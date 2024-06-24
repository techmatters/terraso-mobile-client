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
import {Trans, useTranslation} from 'react-i18next';
import {Linking} from 'react-native';

import {HorizontalIconButton} from 'terraso-mobile-client/components/icons/HorizontalIconButton';
import {
  Box,
  Column,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';

export const DataPrivacyContent = () => {
  const {t} = useTranslation();

  return (
    <Column space="12px">
      <Text variant="body1">
        <Trans i18nKey="general.info.privacy_item1">
          <Text bold>first</Text>
          <Text>second</Text>
        </Trans>
      </Text>
      <Text variant="body1">
        <Trans i18nKey="general.info.privacy_item2">
          <Text bold>first</Text>
          <Text>second</Text>
        </Trans>
      </Text>
      <Box pt={1} pb={1}>
        <HorizontalIconButton
          name="open-in-new"
          label={t('general.info.data_portal_link_text')}
          colorScheme="primary.main"
          isUppercase={true}
          onPress={() =>
            Linking.openURL(t('general.info.data_portal_link_url'))
          }
        />
      </Box>
      <Text variant="body1">
        <Trans i18nKey="general.info.privacy_item3">
          <Text bold>first</Text>
          <Text>second</Text>
        </Trans>
      </Text>
      <Text variant="body1">
        <Trans i18nKey="general.info.privacy_item4">
          <Text bold>first</Text>
          <Text>second</Text>
        </Trans>
      </Text>
      <Text variant="body1">
        <Trans i18nKey="general.info.privacy_item5">
          <Text bold>first</Text>
          <Text>second</Text>
        </Trans>
      </Text>
      <Text variant="body1">
        <Trans i18nKey="general.info.privacy_item6">
          <Text bold>first</Text>
          <Text>second</Text>
        </Trans>
      </Text>
      <Box pt={1} pb={1}>
        <HorizontalIconButton
          name="open-in-new"
          label={t('general.info.privacy_policy_link_text')}
          colorScheme="primary.main"
          isUppercase={true}
          onPress={() =>
            Linking.openURL(t('general.info.privacy_policy_link_url'))
          }
        />
      </Box>
    </Column>
  );
};
