export type Lang = 'uz' | 'ru' | 'en';

import _uz from './i18n/uz';

// translations.uz is always populated (synchronous import — included in the main bundle).
// translations.ru and translations.en start as empty objects and are lazy-loaded by
// LangContext when the user switches language. Until the load resolves, uz keys are
// used as the fallback (see LangContext.tsx). Backward-compat: export type is preserved.
export const translations: Record<Lang, Record<string, string>> = {
  uz: _uz,
  ru: {},
  en: {},
};
