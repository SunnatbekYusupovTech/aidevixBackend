'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { translations, Lang } from '@utils/i18n';

const LANG_STORAGE_KEY = 'aidevix_lang';

const readInitialLang = (): Lang => {
  if (typeof window === 'undefined') {
    return 'uz';
  }

  const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
  if (saved === 'uz' || saved === 'ru' || saved === 'en') {
    return saved;
  }

  return 'uz';
};

const syncDocumentLang = (nextLang: Lang) => {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  root.lang = nextLang;
  root.dataset.lang = nextLang;
};

// Lazy-load a non-default language dict and merge it into the shared translations object.
// Uses explicit import() calls so webpack/Next.js can statically analyse the chunks.
const loadLangDict = (lang: 'ru' | 'en'): Promise<void> => {
  if (lang === 'ru') {
    return import('@utils/i18n/ru').then((mod) => {
      Object.assign(translations.ru, mod.default);
    });
  }
  return import('@utils/i18n/en').then((mod) => {
    Object.assign(translations.en, mod.default);
  });
};

interface LangContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string>) => string;
}

const LangContext = createContext<LangContextType>({
  lang: 'uz',
  setLang: () => {},
  t: (key) => key,
});

export function LangProvider({ children }: { children: ReactNode }) {
  // SSR-safe initial value — localStorage is unavailable on the server.
  // Real value is read from localStorage in useEffect after mount.
  const [lang, setLangState] = useState<Lang>('uz');

  // Incremented each time a lazy dict finishes loading, so t() is re-created.
  const [dictVersion, setDictVersion] = useState(0);

  useEffect(() => {
    // On mount, sync real lang from localStorage
    const saved = readInitialLang();
    if (saved !== lang) {
      setLangState(saved);
    } else {
      syncDocumentLang(lang);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    syncDocumentLang(lang);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    }

    // uz is always synchronously available (main bundle); ru/en are lazy-loaded on demand.
    if (lang !== 'uz' && Object.keys(translations[lang]).length === 0) {
      loadLangDict(lang).then(() => {
        setDictVersion((v) => v + 1);
      });
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== LANG_STORAGE_KEY) {
        return;
      }

      if (event.newValue === 'uz' || event.newValue === 'ru' || event.newValue === 'en') {
        setLangState(event.newValue);
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string>): string => {
    // While a non-uz dict is loading, fall back to en then uz (both always safe).
    let text = translations[lang]?.[key] ?? translations.en?.[key] ?? translations.uz?.[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v);
      });
    }
    return text;
  // dictVersion causes t() to be re-created once the lazy dict has been populated.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, dictVersion]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export const useLang = () => useContext(LangContext);
