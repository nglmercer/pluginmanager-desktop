import i18next from 'i18next';
import { initLitI18n } from 'lit-i18n';
import { es } from './langs/es';
import { en } from './langs/en';
const resources = {
  en: {
    translation: en
  },
  es: {
    translation: es
  }
};

// Simple language detection
const systemLang = navigator.language.split('-')[0];
const defaultLang = resources.hasOwnProperty(systemLang) ? systemLang : 'en';

export const i18nPromise = i18next.use(initLitI18n).init({
  lng: defaultLang,
  fallbackLng: 'en',
  resources,
  interpolation: {
    escapeValue: false // lit-html handles escaping
  }
});

export { i18next };
