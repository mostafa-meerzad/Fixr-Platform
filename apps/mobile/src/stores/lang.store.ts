import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as Localization from 'expo-localization';
import { I18nManager, NativeModules } from 'react-native';
import i18n from '@/i18n';

export type Lang = 'en' | 'fa';

const LANG_KEY = 'fixr_lang';

function detectDeviceLang(): Lang {
  const locale = Localization.getLocales()[0]?.languageCode ?? 'en';
  return locale === 'fa' || locale === 'prs' || locale === 'dar' ? 'fa' : 'en';
}

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
    const lang: Lang = stored === 'fa' ? 'fa' : stored === 'en' ? 'en' : detectDeviceLang();
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

    if (I18nManager.isRTL !== isRTL) {
      I18nManager.forceRTL(isRTL);
      // forceRTL requires a JS reload to flip native layout direction
      NativeModules.DevSettings?.reload();
    }

    set({ lang, isRTL });
  },
}));
