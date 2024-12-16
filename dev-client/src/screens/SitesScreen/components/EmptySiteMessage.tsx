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

import {TranslatedParagraph} from 'terraso-mobile-client/components/content/typography/TranslatedParagraph';
import {Text, View} from 'terraso-mobile-client/components/NativeBaseAdapters';
import {
  GetStartedMessage,
  styles,
} from 'terraso-mobile-client/screens/SitesScreen/components/GetStartedMessage';

export const EmptySiteMessage = () => {
  return (
    <View px="17px">
      <Text bold>
        <TranslatedParagraph i18nKey="site.empty.info" />
      </Text>

      <GetStartedMessage />

      <View style={styles.enter}>
        <TranslatedParagraph i18nKey="site.empty.summary" />
      </View>
    </View>
  );
};
