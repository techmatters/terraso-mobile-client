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

import {forwardRef, useMemo} from 'react';
import {useTranslation} from 'react-i18next';

import {BulletList} from 'terraso-mobile-client/components/BulletList';
import {ModalHandle} from 'terraso-mobile-client/components/modals/Modal';
import {
  Heading,
  Text,
} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {InfoSheet} from 'terraso-mobile-client/components/sheets/InfoSheet';

const BASE_EXPORT_FILE_ITEMS = [
  'export.file_contents.site_name',
  'export.file_contents.project_name',
  'export.file_contents.latitude',
  'export.file_contents.longitude',
  'export.file_contents.elevation',
  'export.file_contents.observations',
  'export.file_contents.location_ranked_soil',
  'export.file_contents.top_match_soil',
  'export.file_contents.user_selected_soil',
  'export.file_contents.land_capability',
];

const US_ONLY_ITEMS = ['export.file_contents.ecological_site'];

const FINAL_ITEMS = ['export.file_contents.notes'];

type ExportFileInfoSheetProps = {
  includeUSFields?: boolean;
};

export const ExportFileInfoSheet = forwardRef<
  ModalHandle,
  ExportFileInfoSheetProps
>(({includeUSFields = true}, ref) => {
  const {t} = useTranslation();

  const items = useMemo(() => {
    const allItems = [...BASE_EXPORT_FILE_ITEMS];
    if (includeUSFields) {
      allItems.push(...US_ONLY_ITEMS);
    }
    allItems.push(...FINAL_ITEMS);
    return allItems;
  }, [includeUSFields]);

  return (
    <InfoSheet
      ref={ref}
      heading={
        <Heading variant="h5">{t('export.file_contents.title')}</Heading>
      }>
      <BulletList
        data={items}
        renderItem={item => <Text variant="body1">{t(item)}</Text>}
      />
    </InfoSheet>
  );
});
