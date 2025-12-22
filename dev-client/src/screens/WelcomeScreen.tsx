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

import {useCallback} from 'react';
import {useTranslation} from 'react-i18next';
import {ScrollView} from 'react-native-gesture-handler';

import LandPKSTerrasoLogo from 'terraso-mobile-client/assets/LandPKS-from-Terraso-logo.svg';
import {Fab} from 'terraso-mobile-client/components/buttons/Fab';
import {ScreenContentSection} from 'terraso-mobile-client/components/content/ScreenContentSection';
import {TranslatedBulletList} from 'terraso-mobile-client/components/content/typography/TranslatedBulletList';
import {TranslatedParagraph} from 'terraso-mobile-client/components/content/typography/TranslatedParagraph';
import {ExternalLink} from 'terraso-mobile-client/components/links/ExternalLink';
import {
  Box,
  Column,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {APP_CONFIG} from 'terraso-mobile-client/config';
import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';
import {kvStorage} from 'terraso-mobile-client/persistence/kvStorage';

export const WelcomeScreen = () => {
  const {t} = useTranslation();
  const [, setWelcomeScreenSeenForHash] = kvStorage.useString(
    'welcomeScreenSeenForHash',
    '',
  );
  const navigation = useNavigation();

  // Welcome screen will show on first launch or after welcome content changes
  const onGetStarted = useCallback(() => {
    setWelcomeScreenSeenForHash(APP_CONFIG.welcomeContentHash);
    navigation.popTo('LOGIN');
  }, [navigation, setWelcomeScreenSeenForHash]);

  return (
    <>
      <ScrollView testID="welcome-screen">
        <Box backgroundColor="background.secondary" height="175px">
          <Box alignSelf="center" pt="68px">
            <LandPKSTerrasoLogo />
          </Box>
        </Box>

        <ScreenContentSection title={t('welcome.title')}>
          <Text variant="body1-strong" mb="sm">
            {t('welcome.version_includes.title')}
          </Text>
          <TranslatedBulletList i18nKeyPrefix="welcome.version_includes.bullet_" />

          <Text variant="body1-strong" mb="sm">
            {t('welcome.next.title')}
          </Text>
          <Text variant="body1" mb="sm">
            {t('welcome.next.subtitle')}
          </Text>
          <TranslatedBulletList i18nKeyPrefix="welcome.next.bullet_" />

          <Text variant="body1-strong">{t('welcome.learn_more')}</Text>

          <Box margin="sm">
            <ExternalLink
              label={t('welcome.link_text')}
              url={t('welcome.link_url')}
            />
          </Box>

          <TranslatedParagraph i18nKey="welcome.terms" />

          <Column space="sm" marginTop="sm" margin="sm">
            <ExternalLink
              label={t('general.privacy_policy_link_text')}
              url={t('general.privacy_policy_link_url')}
            />
            <ExternalLink
              label={t('general.terms_of_service_link_text')}
              url={t('general.terms_of_service_link_url')}
            />
          </Column>

          {/* To leave room for the FAB */}
          <Box height="70px" />
        </ScreenContentSection>
      </ScrollView>

      <Fab onPress={onGetStarted} label={t('welcome.get_started')} />
    </>
  );
};
