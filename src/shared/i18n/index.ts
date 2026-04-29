import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import { STORAGE_KEYS } from '@/shared/config/storage'
import en from '@/shared/i18n/locales/en'
import zh from '@/shared/i18n/locales/zh'

const resources = {
  en: { translation: en },
  zh: { translation: zh },
} as const

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'zh',
    supportedLngs: ['zh', 'en'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: STORAGE_KEYS.locale,
      caches: ['localStorage'],
    },
  })

export default i18n
