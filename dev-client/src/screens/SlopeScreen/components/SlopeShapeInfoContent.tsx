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
import {Trans} from 'react-i18next';
import {Text} from 'terraso-mobile-client/components/NativeBaseAdapters';

export const SlopeShapeInfoContent = () => {
  return (
    <>
      <Text>
        <Trans
          i18nKey="slope.shape.info.description"
          values={{units: 'METRIC'}}
          components={{
            bold: <Text bold />,
            // TODO: Add SVG images
          }}
        />
      </Text>
    </>
  );
};
