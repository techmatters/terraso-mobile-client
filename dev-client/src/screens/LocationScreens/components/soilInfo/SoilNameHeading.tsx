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

import {Heading} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {DataRegion} from 'terraso-mobile-client/model/soilIdMatch/soilIdMatches';
import {getSoilNameDisplayText} from 'terraso-mobile-client/screens/LocationScreens/components/soilInfo/globalSoilI18nFunctions';

type SoilNameHeadingProps = {
  soilName: string;
  dataRegion: DataRegion;
};

export const SoilNameHeading = ({
  soilName,
  dataRegion,
}: SoilNameHeadingProps) => {
  const {t, i18n} = useTranslation();
  return (
    <Heading variant="h4">
      {getSoilNameDisplayText(soilName, dataRegion, t, i18n)}
    </Heading>
  );
};
