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

import {MMKVLoader, useMMKVStorage} from 'react-native-mmkv-storage';

// TODO-cknipe:
// - Should we consolidate this with the MMKV object for tokenStorage?
//   - Consider: If so, is it fine to use the encrypted storage for this?
// - Hmm regardless where should this file live?
const MMKV = new MMKVLoader().initialize();

if (!MMKV.indexer.hasKey('welcomeScreenAlreadySeen')) {
  MMKV.setBool('welcomeScreenAlreadySeen', false);
}

export const useStorage = (key: string, defaultValue: any) => {
  const [value, setValue] = useMMKVStorage(key, MMKV, defaultValue);
  return [value, setValue];
};
