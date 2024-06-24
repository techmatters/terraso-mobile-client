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

import {useTranslation} from 'react-i18next';

import {TranslatedParagraph} from 'terraso-mobile-client/components/content/typography/TranslatedParagraph';
import {ExternalLink} from 'terraso-mobile-client/components/links/ExternalLink';
import InternalLink from 'terraso-mobile-client/components/links/InternalLink';
import {Column} from 'terraso-mobile-client/components/NativeBaseAdapters';

export const DataPrivacyContent = () => {
  const {t} = useTranslation();

  return (
    <Column space="12px">
      <TranslatedParagraph i18nKey="general.info.privacy_item1" />
      <ExternalLink
        label={t('general.info.data_portal_link_text')}
        url={t('general.info.data_portal_link_url')}
      />
      <TranslatedParagraph i18nKey="general.info.privacy_item2" />
      <TranslatedParagraph i18nKey="general.info.privacy_item3" />
      <TranslatedParagraph i18nKey="general.info.privacy_item4" />
      <InternalLink
        label={t('general.info.privacy_policy_link_text')}
        url={t('general.info.privacy_policy_link_url')}
      />
    </Column>
  );
};
