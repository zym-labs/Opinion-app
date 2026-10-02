// Minimal i18n: t('key', { name }) looks the string up in the device language, falling back to
// English. Adding a language = adding a file in locales/ with the same keys and registering it here.
import { getLocales } from 'expo-localization';

import { en, type StringKey } from '@/locales/en';

type Dict = Partial<Record<StringKey, string>>;
const DICTS: Record<string, Dict> = { en };

const lang = getLocales()[0]?.languageCode ?? 'en';
const dict: Dict = DICTS[lang] ?? en;

/** Translate a key. {name} placeholders are filled from vars. */
export function t(key: StringKey, vars?: Record<string, string | number>): string {
  const s = dict[key] ?? en[key];
  return vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? '')) : s;
}

/** For keys built at runtime (e.g. API error codes). Returns null when unknown. */
export function tMaybe(key: string): string | null {
  return key in en ? t(key as StringKey) : null;
}
