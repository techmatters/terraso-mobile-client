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

import {kvStorage} from 'terraso-mobile-client/persistence/kvStorage';

export const SUPPORTED_LANGUAGES = [
  'en',
  'es',
  'fr',
  'ka',
  'sw',
  'uk',
] as const;
export const DISPLAY_LANGUAGES = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  ka: 'ქართული',
  sw: 'Kiswahili',
  uk: 'українська',
} as const;

export type LanguageOption = (typeof SUPPORTED_LANGUAGES)[number];

export const fallbackLanguage = 'en' as LanguageOption;
export const fallbackLocale = 'en-US';

export const setLanguage = (lang: LanguageOption) => {
  kvStorage.setString('user-selected-language', lang);
};

export const getLanguage = () => {
  const selectedLanguage = kvStorage.getString('user-selected-language');
  if (selectedLanguage && isSupportedLanguage(selectedLanguage)) {
    return selectedLanguage as LanguageOption;
  }
  const deviceLanguage = getDeviceLanguage();
  if (deviceLanguage && isSupportedLanguage(deviceLanguage)) {
    return deviceLanguage as LanguageOption;
  }
  return fallbackLanguage;
};

const isSupportedLanguage = (language: string) => {
  return SUPPORTED_LANGUAGES.includes(language as LanguageOption);
};

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

export function languageDisplayString(lng: LanguageOption) {
  return DISPLAY_LANGUAGES[lng];
}
