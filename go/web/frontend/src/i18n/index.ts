import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './en.json'
import tr from './tr.json'

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    tr: { translation: tr },
  },
  lng: localStorage.getItem('imc.locale') || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
