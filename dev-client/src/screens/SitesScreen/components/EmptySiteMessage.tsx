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

import {StyleSheet} from 'react-native';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import {TranslatedParagraph} from 'terraso-mobile-client/components/content/typography/TranslatedParagraph';
import {Icon} from 'terraso-mobile-client/components/icons/Icon';
import {Text, View} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {convertColorProp} from 'terraso-mobile-client/components/util/nativeBaseAdapters';

export const EmptySiteMessage = () => {
  return (
    <View px="17px">
      <Text bold>
        <TranslatedParagraph i18nKey="site.empty.info" />
      </Text>

      <View style={styles.view}>
        <MaterialCommunityIcons
          name="gesture-tap"
          size={14}
          color={convertColorProp('text.icon')}
          style={styles.communityIcon}
        />
        <TranslatedParagraph i18nKey="site.empty.map" />
      </View>

      <View style={styles.view}>
        <Icon name="my-location" color="text.icon" size={14} pr={5} />
        <TranslatedParagraph i18nKey="site.empty.icon" />
      </View>

      <View style={styles.enter}>
        <Icon name="search" color="text.icon" size={14} pr={5} marginTop={1} />
        <TranslatedParagraph i18nKey="site.empty.coords" />
      </View>

      <View style={styles.enter}>
        <TranslatedParagraph i18nKey="site.empty.summary" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  communityIcon: {marginRight: 20},
});
