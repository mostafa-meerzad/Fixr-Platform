import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import i18n from '@/i18n';

export type Lang = 'en' | 'fa';

const LANG_KEY = 'fixr_lang';

interface LangState {
  lang: Lang;
  isRTL: boolean;
  langLoaded: boolean;
  initialize: () => Promise<void>;
  setLang: (lang: Lang) => Promise<void>;
}

export const useLangStore = create<LangState>((set) => ({
  lang: 'en',
  isRTL: false,
  langLoaded: false,

  initialize: async () => {
    const lang: Lang = 'en';
    const isRTL = false;
    await i18n.changeLanguage(lang);
    set({ lang, isRTL, langLoaded: true });
  },

  setLang: async (lang: Lang) => {
    const isRTL = lang === 'fa';
    await SecureStore.setItemAsync(LANG_KEY, lang);
    await i18n.changeLanguage(lang);
    set({ lang, isRTL });
  },
}));
