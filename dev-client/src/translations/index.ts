import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import en from 'terraso-mobile-client/translations/en.json';

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  resources: {
    en: {
      translation: {
        ...en,
      },
    },
  },
  lng: 'en',
  // TODO: make this depend on the build
  debug: true,
  fallbackLng: 'en',
  interpolation: {
    // react already escapes HTML tags by default
    escapeValue: false,
  },
});

export default i18n;
