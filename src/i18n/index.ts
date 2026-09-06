import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import ptPT from './locales/pt-PT.json';

export const resources = {
  en: { translation: en },
  'pt-PT': { translation: ptPT },
} as const;

export const supportedLanguages = Object.keys(resources);

function detectDeviceLanguage(): string {
  const deviceTag = Localization.getLocales()[0]?.languageTag;
  return supportedLanguages.includes(deviceTag ?? '') ? deviceTag! : 'en';
}

i18n.use(initReactI18next).init({
  resources,
  lng: detectDeviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
