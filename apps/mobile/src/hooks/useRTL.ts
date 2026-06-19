import { I18nManager } from 'react-native';
import { useTranslation } from 'react-i18next';

export function useRTL() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'fa';

  if (isRTL !== I18nManager.isRTL) {
    I18nManager.forceRTL(isRTL);
  }

  return {
    isRTL,
    textAlign: isRTL ? ('right' as const) : ('left' as const),
    flexDirection: isRTL ? ('row-reverse' as const) : ('row' as const),
  };
}
