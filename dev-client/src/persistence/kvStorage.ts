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

import {
  MMKV,
  useMMKVBoolean,
  useMMKVNumber,
  useMMKVObject,
  useMMKVString,
} from 'react-native-mmkv';

// helpful things to know about MMKV:
//
// there are two layers of library involved with MMKV.
//
// there's the underlying cross-platform native library:
//   https://github.com/Tencent/MMKV
// and then there's the react native wrapper library:
//   https://www.npmjs.com/package/react-native-mmkv
// there is also a competing react native wrapper library, which
// we used originally but abandoned due to slow maintenance:
//   https://www.npmjs.com/package/react-native-mmkv-storage
//
// MMKV does not necessarily write to disk after every operation,
// it will keep data in memory and only flush it when necessary
// for performance reasons. I'm not sure if the RN API exposes a
// way to manually flush to disk, there's a `clearMemoryCache`
// method which presumably does this but haven't confirmed.
//
// There is discussion on all of the libraries of a potential memory
// use issue:
//   https://github.com/ammarahm-ed/react-native-mmkv-storage/issues/286
//   https://github.com/mrousavy/react-native-mmkv/issues/440
//   https://github.com/Tencent/MMKV/issues/610
// I ran a test in our environment and was unable to reproduce (persisted
// entire redux state to storage in a loop for several hours), but leaving
// here for context. There is also a `trim` method on storage
// object which may help.

const MMKV_STORAGE_ID = 'mmkv.storage';

const mmkvStorage = new MMKV({id: MMKV_STORAGE_ID});

export const kvStorage = {
  setBool: (key: string, value: boolean) => mmkvStorage.set(key, value),
  setString: (key: string, value: string) => mmkvStorage.set(key, value),
  setNumber: (key: string, value: number) => mmkvStorage.set(key, value),
  setObject: (key: string, value: object) =>
    mmkvStorage.set(key, JSON.stringify(value)),
  getBool: (key: string) => mmkvStorage.getBoolean(key),
  getString: (key: string) => mmkvStorage.getString(key),
  getNumber: (key: string) => mmkvStorage.getNumber(key),
  getObject: <T extends object>(key: string) => {
    const str = mmkvStorage.getString(key);
    if (str === undefined) return str;
    return JSON.parse(str) as T;
  },
  useBool: (key: string, defaultValue: boolean) => {
    const [value, setValue] = useMMKVBoolean(key, mmkvStorage);
    return [value ?? defaultValue, setValue] as const;
  },
  useString: (key: string, defaultValue: string) => {
    const [value, setValue] = useMMKVString(key, mmkvStorage);
    return [value ?? defaultValue, setValue] as const;
  },
  useNumber: (key: string, defaultValue: number) => {
    const [value, setValue] = useMMKVNumber(key, mmkvStorage);
    return [value ?? defaultValue, setValue] as const;
  },
  useObject: <T>(key: string, defaultValue: T) => {
    const [value, setValue] = useMMKVObject<T>(key, mmkvStorage);
    return [value ?? defaultValue, setValue] as const;
  },
  hasKey: mmkvStorage.contains,
  remove: mmkvStorage.delete,
};
