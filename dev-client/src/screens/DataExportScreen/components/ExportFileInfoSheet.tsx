/*
 * Copyright © 2025 Technology Matters
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

import {forwardRef} from 'react';
import {useTranslation} from 'react-i18next';

import {TranslatedParagraph} from 'terraso-mobile-client/components/content/typography/TranslatedParagraph';
import {ModalHandle} from 'terraso-mobile-client/components/modals/Modal';
import {Heading} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {InfoSheet} from 'terraso-mobile-client/components/sheets/InfoSheet';

export const ExportHelpSheet = forwardRef<ModalHandle, object>((_, ref) => {
  const {t} = useTranslation();

  return (
    <InfoSheet
      ref={ref}
      heading={<Heading variant="h5">{t('export.help.title')}</Heading>}>
      <Heading variant="h6" fontWeight={700} mb="sm">
        {t('export.help.section_file_vs_link')}
      </Heading>
      <TranslatedParagraph
        i18nKey="export.help.save_file_description"
        mb="md"
      />
      <TranslatedParagraph
        i18nKey="export.help.live_link_description"
        mb="lg"
      />

      <Heading variant="h6" fontWeight={700} mb="sm">
        {t('export.help.section_format')}
      </Heading>
      <TranslatedParagraph i18nKey="export.help.csv_description" mb="md" />
      <TranslatedParagraph i18nKey="export.help.json_description" />
    </InfoSheet>
  );
});
