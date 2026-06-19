import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import faCommon from './fa/common';
import enCommon from './en/common';

export const defaultLanguage = 'fa';

i18n.use(initReactI18next).init({
  resources: {
    fa: { common: faCommon },
    en: { common: enCommon },
  },
  lng: defaultLanguage,
  fallbackLng: 'en',
  defaultNS: 'common',
  interpolation: { escapeValue: false },
});

export default i18n;
