'use client';
import { locales, languageNames, isLocale } from '@/lib/i18n';
import { useLanguage } from './LanguageProvider';

export default function LanguageSwitcher({ inverted = false }: { inverted?: boolean }) {
  const { locale, setLocale, t } = useLanguage();
  return <select aria-label={t('language')} value={locale} onChange={event => { if (isLocale(event.target.value)) setLocale(event.target.value); }} className={`max-w-28 rounded-sm border border-current/20 bg-transparent px-2 py-1.5 text-sm ${inverted ? 'text-white/70' : 'text-[#3d3d3d] dark:text-[#c5c3bf]'} focus-visible:outline-2 focus-visible:outline-[#b8956c]`}>
    {locales.map(value => <option key={value} value={value} lang={value} className="bg-white text-[#1a1a1a] dark:bg-[#171614] dark:text-[#e8e6e3]">{languageNames[value]}</option>)}
  </select>;
}
