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

import {useEffect} from 'react';
import {ToastAndroid} from 'react-native';

import {useNavigation} from 'terraso-mobile-client/navigation/hooks/useNavigation';

type RequiredDataAndWhatToDoIfMissing = {
  data: any;
  doIfMissing?: () => void;
};

const dataExists = (data: any) => {
  // TODO-cknipe: Is this the right check?
  return data !== null && data !== undefined;
};
// First item should be the entity with the largest scope
// Example: if EditSiteNoteScreen is missing the site and the site note, the missing site takes precedence so should come first
export const useRequiredData = (
  requirements: RequiredDataAndWhatToDoIfMissing[],
) => {
  const navigation = useNavigation();

  useEffect(() => {
    for (let {data, doIfMissing} of requirements) {
      if (!dataExists(data)) {
        doIfMissing === undefined
          ? navigation.navigate('BOTTOM_TABS')
          : doIfMissing();
        // TODO: Decide design / Decide how to show toasts?
        ToastAndroid.show('Sorry, someone deleted that!', ToastAndroid.SHORT);
        return;
      }
    }
  }, [requirements, navigation]);

  return requirements.every(({data}) => dataExists(data));
};
