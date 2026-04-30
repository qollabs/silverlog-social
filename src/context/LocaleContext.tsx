'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { type Locale, type UiKey, ui } from '@/lib/i18n';

interface LocaleContextValue {
  locale: Locale;
  toggle: () => void;
  t: (key: UiKey) => string;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'ko',
  toggle: () => {},
  t: (key) => ui.ko[key] as string,
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('ko');

  useEffect(() => {
    const saved = localStorage.getItem('sl_locale') as Locale | null;
    if (saved === 'en' || saved === 'ko') setLocale(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    localStorage.setItem('sl_locale', locale);
  }, [locale]);

  const toggle = () => setLocale((l) => (l === 'ko' ? 'en' : 'ko'));
  const t = (key: UiKey) => ui[locale][key] as string;

  return (
    <LocaleContext.Provider value={{ locale, toggle, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
