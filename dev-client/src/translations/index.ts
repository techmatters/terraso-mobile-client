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

import {initReactI18next} from 'react-i18next';

import i18n from 'i18next';

import 'intl-pluralrules';

import {
  fallbackLanguage,
  getLanguage,
} from 'terraso-mobile-client/localization';
import en from 'terraso-mobile-client/translations/en.json';
import es from 'terraso-mobile-client/translations/es.json';
import fr from 'terraso-mobile-client/translations/fr.json';
import ka from 'terraso-mobile-client/translations/ka.json';
import uk from 'terraso-mobile-client/translations/uk.json';

// For changes to make when new languages are added, see https://docs.google.com/document/d/1IEy2LX1_ZSVYTZkAaL9P0IePm2huslViU7BC89KY_Lw/edit?tab=t.0#heading=h.v5pkyfuey9gh
i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    en: {
      translation: en,
    },
    es: {
      translation: es,
    },
    fr: {
      translation: fr,
    },
    ka: {
      translation: ka,
    },
    uk: {
      translation: uk,
    },
  },
  debug: __DEV__ && process.env.NODE_ENV !== 'test',
  lng: getLanguage(),
  fallbackLng: fallbackLanguage,
  interpolation: {
    // react already escapes HTML tags by default
    escapeValue: false,
  },
});

export default i18n;
