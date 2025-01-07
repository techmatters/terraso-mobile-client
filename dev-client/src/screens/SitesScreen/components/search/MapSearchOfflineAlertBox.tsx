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

import {StyleSheet, Text, View} from 'react-native';

import {TranslatedContent} from 'terraso-mobile-client/components/content/typography/TranslatedContent';
import {convertColorProp} from 'terraso-mobile-client/components/util/nativeBaseAdapters';

export const MapSearchOfflineAlertBox = () => {
  return (
    <View style={styles.container}>
      <Text>
        <TranslatedContent i18nKey="site.search.offline" />
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: convertColorProp('background.default'),
    borderWidth: 1,
    borderColor: convertColorProp('text.secondary'),
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginHorizontal: 12,
    width: '92%',
  },
});
