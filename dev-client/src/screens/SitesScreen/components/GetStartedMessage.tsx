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

import {StyleSheet} from 'react-native';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import {TranslatedParagraph} from 'terraso-mobile-client/components/content/typography/TranslatedParagraph';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {View} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {convertColorProp} from 'terraso-mobile-client/components/util/nativeBaseAdapters';

export const GetStartedMessage = () => {
  return (
    <>
      <View style={styles.view}>
        <MaterialCommunityIcons
          name="gesture-tap"
          size={24}
          color={convertColorProp('text.icon')}
          style={styles.communityIcon}
        />
        <View style={styles.flex}>
          <TranslatedParagraph i18nKey="site.empty.map" />
        </View>
      </View>

      <View style={styles.view}>
        <Icon name="my-location" color="text.icon" size={24} pr={5} />
        <View style={styles.flex}>
          <TranslatedParagraph i18nKey="site.empty.icon" />
        </View>
      </View>

      <View style={styles.enter}>
        <Icon name="search" color="text.icon" size={24} pr={5} marginTop={1} />
        <View style={styles.flex}>
          <TranslatedParagraph i18nKey="site.empty.coords" />
        </View>
      </View>
    </>
  );
};

export const styles = StyleSheet.create({
  view: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'center',
  },
  enter: {
    flexDirection: 'row',
    marginTop: 10,
    alignItems: 'flex-start',
  },
  flex: {
    flex: 1,
  },
  communityIcon: {marginRight: 20},
});
