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

import {getLocales} from 'expo-localization';

export const fallbackLanguage = 'en';
export const fallbackLocale = 'en-US';

export const getSystemLocale = () => {
  let deviceLocale = getLocales()[0]?.languageTag;
  if (deviceLocale === null) {
    deviceLocale = fallbackLocale;
  }

  return deviceLocale;
};

export const getDeviceLanguage = () => {
  let deviceLanguage = getLocales()[0]?.languageCode;

  if (!deviceLanguage) {
    deviceLanguage = fallbackLanguage;
  }

  return deviceLanguage;
};
