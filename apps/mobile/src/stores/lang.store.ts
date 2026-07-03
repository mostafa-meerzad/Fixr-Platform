import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { I18nManager } from 'react-native';
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
    const stored = (await SecureStore.getItemAsync(LANG_KEY)) as Lang | null;
    const lang: Lang = stored === 'fa' ? 'fa' : 'en';
    const isRTL = lang === 'fa';

    await i18n.changeLanguage(lang);

    // forceRTL at startup so native layout is correct from first render.
    // This has no effect mid-session; a restart is needed for layout to flip.
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.forceRTL(isRTL);
    }

    set({ lang, isRTL, langLoaded: true });
  },

  setLang: async (lang: Lang) => {
    const isRTL = lang === 'fa';
    await SecureStore.setItemAsync(LANG_KEY, lang);
    await i18n.changeLanguage(lang);

    // Text content and textAlign changes take effect immediately.
    // Native layout flip (flex row reversal in nav bars etc.) needs a restart.
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.forceRTL(isRTL);
    }

    set({ lang, isRTL });
  },
}));
