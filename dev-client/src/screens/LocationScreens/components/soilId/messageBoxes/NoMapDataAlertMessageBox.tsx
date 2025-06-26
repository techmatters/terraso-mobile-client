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

import {useTranslation} from 'react-i18next';

import {AlertMessageBox} from 'terraso-mobile-client/components/messages/AlertMessageBox';
import {Box, Text} from 'terraso-mobile-client/components/NativeBaseAdapters';

export const NoMapDataAlertMessageBox = () => {
  const {t} = useTranslation();

  return (
    <AlertMessageBox title={t('site.soil_id.matches.no_map_data_title')}>
      <Box>
        <Text variant="body1" mb="sm">
          {t('site.soil_id.matches.no_map_data_body')}
        </Text>
      </Box>
    </AlertMessageBox>
  );
};
