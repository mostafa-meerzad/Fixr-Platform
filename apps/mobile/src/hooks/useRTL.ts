import { useTranslation } from 'react-i18next';

export function useRTL() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'fa';

  return {
    isRTL,
    textAlign: isRTL ? ('right' as const) : ('left' as const),
    flexDirection: isRTL ? ('row-reverse' as const) : ('row' as const),
  };
}
