'use client';

import { useLocale } from '@/context/LocaleContext';

export function LangToggle() {
  const { locale, toggle } = useLocale();

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={locale === 'ko' ? 'Switch to English' : '한국어로 전환'}
      className="fixed top-4 right-4 z-50 px-3 py-1.5 rounded-full text-sm font-semibold bg-surface/90 backdrop-blur border border-line shadow-sm text-ink hover:bg-primary hover:text-white hover:border-primary transition-colors"
    >
      {locale === 'ko' ? 'EN' : '한국어'}
    </button>
  );
}
