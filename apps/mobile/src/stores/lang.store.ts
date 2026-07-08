import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { I18nManager, NativeModules } from 'react-native';
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
    // Dari phase not yet active — always lock to English regardless of device
    // locale or stored preference. RTL deferred (see CLAUDE.md).
    const lang: Lang = 'en';
    const isRTL = false;

    if (I18nManager.isRTL) {
      I18nManager.forceRTL(false);
    }

    await i18n.changeLanguage(lang);
    set({ lang, isRTL, langLoaded: true });
  },

  setLang: async (lang: Lang) => {
    const isRTL = lang === 'fa';
    await SecureStore.setItemAsync(LANG_KEY, lang);
    await i18n.changeLanguage(lang);

    if (I18nManager.isRTL !== isRTL) {
      I18nManager.forceRTL(isRTL);
      // forceRTL requires a JS reload to flip native layout direction
      NativeModules.DevSettings?.reload();
    }

    set({ lang, isRTL });
  },
}));
