import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Storage from 'expo-sqlite/kv-store';

import en from './locales/en.json';
import ptPT from './locales/pt-PT.json';

export const resources = {
  en: { translation: en },
  'pt-PT': { translation: ptPT },
} as const;

export const supportedLanguages = Object.keys(resources);

export type LanguagePreference = 'system' | (typeof supportedLanguages)[number];

const LANGUAGE_PREFERENCE_KEY = 'settings.languagePreference';

function detectDeviceLanguage(): string {
  const deviceTag = Localization.getLocales()[0]?.languageTag;
  return supportedLanguages.includes(deviceTag ?? '') ? deviceTag! : 'en';
}

function resolveLanguage(preference: LanguagePreference): string {
  return preference === 'system' ? detectDeviceLanguage() : preference;
}

// Read synchronously so the correct language is active on the very first
// render, instead of flashing the device/fallback language while an async
// read resolves.
export function getLanguagePreference(): LanguagePreference {
  const stored = Storage.getItemSync(LANGUAGE_PREFERENCE_KEY);
  return stored === 'system' || supportedLanguages.includes(stored ?? '')
    ? (stored as LanguagePreference)
    : 'system';
}

export function setLanguagePreference(preference: LanguagePreference): void {
  Storage.setItem(LANGUAGE_PREFERENCE_KEY, preference);
  i18n.changeLanguage(resolveLanguage(preference));
}

i18n.use(initReactI18next).init({
  resources,
  lng: resolveLanguage(getLanguagePreference()),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
