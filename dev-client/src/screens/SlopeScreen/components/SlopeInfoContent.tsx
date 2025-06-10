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

import {Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {useSoilIdOutput} from 'terraso-mobile-client/hooks/soilIdHooks';

type SlopeInfoContentProps = {siteId: string};

export const SlopeInfoContent = ({siteId}: SlopeInfoContentProps) => {
  const {t} = useTranslation();
  const soilIdOutput = useSoilIdOutput({siteId});
  const dataRegion = soilIdOutput.dataRegion;

  return (
    <>
      <Text>
        {t('slope.info.description', {
          data_region_text:
            dataRegion === 'US'
              ? t('slope.info.data_region_text_US')
              : t('slope.info.data_region_text_global_or_unknown'),
        })}
      </Text>
    </>
  );
};
