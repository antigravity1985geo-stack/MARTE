import { type Lang } from './translations';

/**
 * getTranslatedField
 * 
 * Dynamically selects the translated version of a field based on the current language.
 * Falls back to the base field (Georgian) if the translation is missing.
 * 
 * Example:
 *   getTranslatedField(product, 'name', 'en') -> product.name_en || product.name
 */
export function getTranslatedField<T extends Record<string, any>>(
  item: T,
  field: string,
  lang: Lang
): string {
  if (!item) return '';
  
  // ka is base
  if (lang === 'ka') return item[field] || '';
  
  const translatedField = `${field}_${lang}`;
  return item[translatedField] || item[field] || '';
}
