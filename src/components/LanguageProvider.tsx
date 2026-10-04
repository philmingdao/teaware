'use client';

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { isLocale, languageTags, localizedHref, translate, siteDescription, type Locale, type MessageKey } from '@/lib/i18n';

const LANGUAGE_KEY = 'teaware-language-v1';
const CHANGE = 'teaware-language-change';
function readLocale(): Locale {
  const requested = new URLSearchParams(window.location.search).get('lang');
  if (isLocale(requested)) return requested;
  try { const saved = localStorage.getItem(LANGUAGE_KEY); if (isLocale(saved)) return saved; } catch {}
  return 'zh';
}
function subscribe(notify: () => void) {
  window.addEventListener(CHANGE, notify);
  window.addEventListener('popstate', notify);
  window.addEventListener('storage', notify);
  return () => {
    window.removeEventListener(CHANGE, notify);
    window.removeEventListener('popstate', notify);
    window.removeEventListener('storage', notify);
  };
}
function changeLocale(locale: Locale) {
  try { localStorage.setItem(LANGUAGE_KEY, locale); } catch {}
  const url = new URL(window.location.href);
  url.searchParams.set('lang', locale);
  window.history.replaceState(window.history.state, '', url);
  window.dispatchEvent(new Event(CHANGE));
}
type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
  href: (value: string) => string;
};
const LanguageContext = createContext<LanguageContextValue | null>(null);

export default function LanguageProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, readLocale, () => 'zh' as Locale);
  const pathname = usePathname();
  useEffect(() => {
    document.documentElement.lang = languageTags[locale];
    if (readLocale() === locale) { try { localStorage.setItem(LANGUAGE_KEY, locale); } catch {} }
    const page = pathname.includes('/cutout-gallery') ? 'closeLook' : pathname.includes('/gallery') ? 'gallery' : pathname.includes('/about') ? 'about' : pathname.includes('/tv') ? 'tv' : pathname.includes('/contact') ? 'contact' : null;
    const updateTitle = () => {
      const artworkHeading = pathname.includes('/artwork') ? document.querySelector('main h1')?.textContent : null;
      const prefix = artworkHeading || (page ? translate(locale, page) : '');
      const title = `${prefix ? `${prefix} | ` : ''}${translate(locale, 'siteTitle')} | ${translate(locale, 'brand')}`;
      if (document.title !== title) document.title = title;
      for (const name of ['og:title', 'twitter:title']) document.querySelector(`meta[property="${name}"], meta[name="${name}"]`)?.setAttribute('content', title);
    };
    updateTitle();
    for (const name of ['description', 'og:description', 'twitter:description']) {
      document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)?.setAttribute('content', siteDescription(locale));
    }
    // Next can insert static route metadata after hydration. Keep the chosen language
    // when that happens, including on direct links and client-side navigation.
    const observer = new MutationObserver(updateTitle);
    observer.observe(document.head, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [locale, pathname]);
  const value = useMemo<LanguageContextValue>(() => ({ locale, setLocale: changeLocale, t: (key, values) => translate(locale, key, values), href: link => localizedHref(link, locale) }), [locale]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage requires LanguageProvider');
  return context;
}
