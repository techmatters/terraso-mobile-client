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
import {Trans, useTranslation} from 'react-i18next';
import {Text} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {BulletList} from 'terraso-mobile-client/components/BulletList';

export const TextureInfoContent = () => {
  const {t} = useTranslation();

  return (
    <Text>
      <Trans
        i18nKey="soil.texture.info.description"
        values={{units: 'METRIC'}}
        components={{
          bold: <Text bold />,
          bullets: (
            <BulletList
              data={[1, 2, 3, 4]}
              renderItem={i => (
                <Text variant="body1">{t(`soil.texture.info.point${i}`)}</Text>
              )}
            />
          ),
        }}
      />
    </Text>
  );
};
