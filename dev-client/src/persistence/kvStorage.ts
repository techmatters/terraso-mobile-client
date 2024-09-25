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

import {MMKVLoader} from 'react-native-mmkv-storage';

// helpful things to know about MMKV:
//
// there are two layers of library involved with MMKV.
//
// there's the underlying cross-platform native library:
//   https://github.com/Tencent/MMKV
// and then there's the react native wrapper library:
//   https://www.npmjs.com/package/react-native-mmkv-storage
// there is also a competing react native wrapper library:
//   https://www.npmjs.com/package/react-native-mmkv
//
// the library we use simplifies encryption by automatically
// generating an encryption key and storing it on the keychain,
// which we would have to do manually if we were using the other
// library. at time of writing there is not a well-documented
// migration story from one to the other.
//
// MMKV does not necessarily write to disk after every operation,
// it will keep data in memory and only flush it when necessary
// for performance reasons. I'm not sure if the RN API exposes a
// way to manually flush to disk, there's a `clearMemoryCache`
// method which presumably does this but haven't confirmed.
//
// `withEncryption` only has an effect when the device has never
// initialized the MMKV store before. after first usage, the store
// gets initialized with whatever settings it previously used.
// there are additional methods available for changing the encryption
// settings later: https://rnmmkv.vercel.app/#/workingwithencryption
//
// There is discussion on all of the libraries of a potential memory
// use issue:
//   https://github.com/ammarahm-ed/react-native-mmkv-storage/issues/286
//   https://github.com/mrousavy/react-native-mmkv/issues/440
//   https://github.com/Tencent/MMKV/issues/610
// I ran a test in our environment and was unable to reproduce (persisted
// entire redux state to storage in a loop for several hours), but leaving
// here for context. There is also a `clearMemoryCache` method on storage
// object which may help.

export const kvStorage = new MMKVLoader().withEncryption().initialize();
