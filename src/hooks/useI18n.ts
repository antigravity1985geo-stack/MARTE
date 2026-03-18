import { useI18nStore } from '@/stores/useI18nStore';

/**
 * useI18n — lightweight i18n hook for MARTE
 *
 * Usage:
 *   const { t, lang, setLang } = useI18n();
 *   <h1>{t('dashboard_title')}</h1>
 */
export function useI18n() {
  return useI18nStore();
}
