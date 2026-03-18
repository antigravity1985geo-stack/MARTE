import { create } from 'zustand';
import { getTranslation, type Lang, type TranslationKey } from '@/lib/i18n/translations';

interface I18nStore {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const STORAGE_KEY = 'marte_lang';

const savedLang = (): Lang => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'en' ? 'en' : 'ka';
  } catch {
    return 'ka';
  }
};

export const useI18nStore = create<I18nStore>((set, get) => ({
  lang: savedLang(),

  setLang: (lang: Lang) => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* noop */ }
    set({ lang });
  },

  t: (key: TranslationKey) => getTranslation(key, get().lang),
}));
