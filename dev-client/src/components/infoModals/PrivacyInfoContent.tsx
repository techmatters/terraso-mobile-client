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
import {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import {Linking} from 'react-native';
import {Trans, useTranslation} from 'react-i18next';
import {HorizontalIconButton} from 'terraso-mobile-client/components/Icons';
import {Column} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {Box} from 'terraso-mobile-client/components/core/Box';
import {Text} from 'terraso-mobile-client/components/core/Text';

export const PrivacyInfoContent = () => {
  const {t} = useTranslation();

  return (
    <BottomSheetScrollView>
      <Column space={3} pb="65%" pt={5} px={5} mt="48px">
        <Text width="full" textAlign="left" variant="body1">
          {t('general.info.privacy_title')}
        </Text>
        <Text variant="body1">
          <Trans i18nKey="general.info.privacy_item1">
            <Text variant="body1-strong">first</Text>
            <Text variant="body1">second</Text>
          </Trans>
        </Text>
        <Text variant="body1">
          <Trans i18nKey="general.info.privacy_item2">
            <Text variant="body1-strong">first</Text>
            <Text variant="body1">second</Text>
          </Trans>
        </Text>
        <Box paddingTop={1} paddingBottom={1}>
          <HorizontalIconButton
            name={'open-in-new'}
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
            <Text variant="body1-strong">first</Text>
            <Text variant="body1">second</Text>
          </Trans>
        </Text>
        <Text variant="body1">
          <Trans i18nKey="general.info.privacy_item4">
            <Text variant="body1-strong">first</Text>
            <Text variant="body1">second</Text>
          </Trans>
        </Text>
        <Text variant="body1">
          <Trans i18nKey="general.info.privacy_item5">
            <Text variant="body1-strong">first</Text>
            <Text variant="body1">second</Text>
          </Trans>
        </Text>
        <Text variant="body1">
          <Trans i18nKey="general.info.privacy_item6">
            <Text variant="body1-strong">first</Text>
            <Text variant="body1">second</Text>
          </Trans>
        </Text>
        <Box paddingTop={1} paddingBottom={1}>
          <HorizontalIconButton
            name={'open-in-new'}
            label={t('general.info.privacy_policy_link_text')}
            colorScheme="primary.main"
            isUppercase={true}
            onPress={() =>
              Linking.openURL(t('general.info.privacy_policy_link_url'))
            }
          />
        </Box>
      </Column>
    </BottomSheetScrollView>
  );
};
