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

import {useTranslation} from 'react-i18next';

import {ContainedButton} from 'terraso-mobile-client/components/buttons/ContainedButton';
import {Box} from 'terraso-mobile-client/components/NativeBaseAdapters';

type SiteExportCardProps = {
  onExportPress: () => void;
};

export const SiteExportCard = ({onExportPress}: SiteExportCardProps) => {
  const {t} = useTranslation();

  return (
    <Box variant="tile" p="18px">
      <ContainedButton
        stretchToFit
        rightIcon="chevron-right"
        onPress={onExportPress}
        label={t('export.site_export_title')}
      />
    </Box>
  );
};
