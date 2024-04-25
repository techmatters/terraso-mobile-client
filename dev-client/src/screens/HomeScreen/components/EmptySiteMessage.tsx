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
import {Trans} from 'react-i18next';
import {BulletList} from 'terraso-mobile-client/components/BulletList';
import {Text, View} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {LocationIcon} from 'terraso-mobile-client/components/icons/LocationIcon';

export const EmptySiteMessage = () => {
  return (
    <View px="17px">
      <Text variant="body1">
        <Trans
          i18nKey="site.empty.info"
          components={{
            bold: <Text bold />,
          }}
        />
      </Text>

      <BulletList
        data={[1, 2, 3]}
        renderItem={i => (
          <Text variant="body1" color="text.primary">
            <Trans
              i18nKey={`site.empty.bullet_${i}`}
              components={{icon: <LocationIcon />}}
            />
          </Text>
        )}
      />
    </View>
  );
};
