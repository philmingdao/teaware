'use client';
import { useLanguage } from './LanguageProvider';
import { museumName } from '@/lib/i18n';
import { artworks } from '@/data/artworks';
import Link from './LocaleLink';

// The disclosure reflects the current catalogue rather than a historical source list.
const sources = Array.from(artworks.reduce((map, item) => {
  const key = item.sourceMuseumEnglish || item.sourceMuseum;
  const group = map.get(key);
  if (group) { group.count++; group.licenses.add(item.license); }
  else map.set(key, { artwork: item, count: 1, licenses: new Set([item.license]) });
  return map;
}, new Map<string, { artwork: typeof artworks[number]; count: number; licenses: Set<string> }>()).values());

export default function AboutContent() {
  const { locale, t } = useLanguage();
  return <>
    <section className="pt-32 pb-12 bg-[#f5f3ef] dark:bg-[#171614] text-center px-6">
      <h1 className="text-4xl md:text-5xl leading-tight">{t('about')}</h1>
      <p className="mt-5 text-[#666] dark:text-[#9a9894]">{t('siteTitle')}</p>
    </section>
    <section className="py-16 bg-[#faf9f7] dark:bg-[#0f0f0e]">
      <article className="max-w-3xl mx-auto px-6 lg:px-12 text-[#3d3d3d] dark:text-[#c5c3bf] leading-relaxed">
        <h2 className="text-2xl mb-6">{t('curatorial')}</h2>
        {(['aboutOne', 'aboutTwo', 'aboutThree'] as const).map(id => <p key={id} className="mb-6">{t(id)}</p>)}
        <div className="divider-elegant !my-12" />
        <h2 className="text-2xl mb-6">{t('highlights')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {(['china', 'japan', 'korea', 'exchange'] as const).map(id => <div key={id} className="bg-[#f5f3ef] dark:bg-[#171614] p-6">
            <h3 className="text-lg mb-3">{t(id)}</h3><p className="text-sm">{t(`${id}Text`)}</p>
          </div>)}
        </div>
        <div className="divider-elegant !my-12" />
        <h2 className="text-2xl mb-6">{t('credits')}</h2>
        <p className="mb-6">{t('sourcesIntro')}</p>
        <p className="mb-6 text-[#b8956c] dark:text-[#d4b896]">{t('count', { count: artworks.length.toLocaleString(locale) })}</p>
        <div className="space-y-6">
          {sources.map(({ artwork, count, licenses }) => <div key={artwork.sourceMuseumEnglish || artwork.sourceMuseum} className="border-l-2 border-[#b8956c] pl-6">
            <a href={artwork.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-lg underline-offset-4 hover:underline">{museumName(artwork, locale)} ↗</a>
            <p className="text-sm mt-1">{t('count', {count})}</p>
            <p className="text-xs mt-2 text-[#666] dark:text-[#9a9894]">{Array.from(licenses).join(' · ')}</p>
          </div>)}
        </div>
        <div className="divider-elegant !my-12" />
        <h2 className="text-2xl mb-6">{t('presentation')}</h2>
        <p>{t('presentationText')}</p>
        <blockquote className="bg-[#1a1a1a] text-[#faf9f7] text-center text-lg p-8 mt-12">{t('motto')}</blockquote>
        <div className="text-center mt-12"><Link href="/gallery" className="btn-elegant">{t('backGallery')}</Link></div>
      </article>
    </section>
  </>;
}
