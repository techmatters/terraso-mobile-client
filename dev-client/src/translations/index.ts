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
  debug: __DEV__ && process.env.NODE_ENV !== 'test',
  fallbackLng: 'en',
  interpolation: {
    // react already escapes HTML tags by default
    escapeValue: false,
  },
});

export default i18n;
