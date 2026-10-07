'use client';

import { useEffect } from 'react';
import { useLanguage } from '@/components/LanguageProvider';
import {
  artworkDescription,
  artworkTitle,
  museumName,
  periodName,
  artworkType,
  term,
} from '@/lib/i18n';
import type { Artwork } from '@/types/artwork';
import Link from '@/components/LocaleLink';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ArtifactImage from '@/components/ArtifactImage';
import ArtworkSlideshowButton from '@/components/ArtworkSlideshowButton';
import TVModeLink from '@/components/TVModeLink';

interface Props {
  artwork: Artwork;
  previousArtwork: Artwork | null;
  nextArtwork: Artwork | null;
}

export default function ArtworkDetailView({ artwork, previousArtwork, nextArtwork }: Props) {
  const { locale, t } = useLanguage();

  useEffect(() => {
    document.title = `${artworkTitle(artwork, locale)} | ${t('siteTitle')}`;
  }, [artwork, locale, t]);

  const title = artworkTitle(artwork, locale);

  return (
    <main className="collection-surface flex-1">
      <Header />

      <div className="pt-24 pb-4 bg-[#f5f3ef] dark:bg-[#171614]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <nav className="text-sm text-[#999] dark:text-[#6e6c68]" aria-label={t('nav')}>
            <ol className="flex items-center">
              <li><Link href="/" className="hover:text-[#1a1a1a] dark:hover:text-[#e8e6e3] transition-colors">{t('home')}</Link></li>
              <span className="mx-2">/</span>
              <li><Link href="/gallery/" className="hover:text-[#1a1a1a] dark:hover:text-[#e8e6e3] transition-colors">{t('collection')}</Link></li>
              <span className="mx-2">/</span>
              <li><span aria-current="page" className="text-[#1a1a1a] dark:text-[#e8e6e3]">{title}</span></li>
            </ol>
          </nav>
        </div>
      </div>

      <section className="py-12 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
            <div className="relative">
              <div className="sticky top-32">
                <ArtifactImage
                  id={artwork.id}
                  src={artwork.imageUrl}
                  alt={title}
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority
                />
                <p className="mt-4 text-xs text-[#999] dark:text-[#6e6c68] text-center">
                  {t('imageCredit')}: {museumName(artwork, locale)}
                  <br />
                  <span className="text-[#b8956c] dark:text-[#d4b896]">{artwork.license}</span>
                </p>
              </div>
            </div>

            <div>
              <div className="mb-8">
                <span className="inline-block px-3 py-1 text-sm tracking-wider bg-[#1a1a1a] dark:bg-[#e8e6e3] text-[#faf9f7] dark:text-[#0f0f0e] mb-4">
                  {periodName(artwork.dynasty, locale, artwork.dynastyEnglish)}
                </span>
                <h1 className="text-3xl md:text-4xl font-medium tracking-wider text-[#1a1a1a] dark:text-[#e8e6e3] leading-tight">
                  {title}
                </h1>
                <p className="mt-2 text-lg text-[#666] dark:text-[#9a9894] font-serif-en">
                  {t('sourceTitle')}: {artwork.titleEnglish || artwork.titleChinese}
                </p>
              </div>

              <div className="bg-[#f5f3ef] dark:bg-[#171614] p-6 lg:p-8 rounded-sm mb-8">
                <p className="text-[#3d3d3d] dark:text-[#c5c3bf] leading-relaxed">
                  {artworkDescription(artwork, locale)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <h2 className="text-xs tracking-widest text-[#999] dark:text-[#6e6c68] uppercase mb-1">{t('dynasty')}</h2>
                  <p className="text-[#1a1a1a] dark:text-[#e8e6e3]">{periodName(artwork.dynasty, locale, artwork.dynastyEnglish)}</p>
                </div>
                <div>
                  <h2 className="text-xs tracking-widest text-[#999] dark:text-[#6e6c68] uppercase mb-1">{t('date')}</h2>
                  <p className="text-[#1a1a1a] dark:text-[#e8e6e3]">{artwork.date}</p>
                </div>
                <div>
                  <h2 className="text-xs tracking-widest text-[#999] dark:text-[#6e6c68] uppercase mb-1">{t('material')}</h2>
                  <p className="text-[#1a1a1a] dark:text-[#e8e6e3]">{term(artwork.material, locale, artwork.materialEnglish)}</p>
                  <p className="text-sm text-[#666] dark:text-[#9a9894] font-serif-en">{artwork.materialEnglish}</p>
                </div>
                <div>
                  <h2 className="text-xs tracking-widest text-[#999] dark:text-[#6e6c68] uppercase mb-1">{t('objectType')}</h2>
                  <p className="text-[#1a1a1a] dark:text-[#e8e6e3]">{artworkType(artwork, locale)}</p>
                  <p className="text-sm text-[#666] dark:text-[#9a9894] font-serif-en">{artwork.objectTypeEnglish}</p>
                </div>
                {artwork.kiln && <div>
                  <h2 className="text-xs tracking-widest text-[#999] dark:text-[#6e6c68] uppercase mb-1">{t('kiln')}</h2>
                  <p className="text-[#1a1a1a] dark:text-[#e8e6e3]">{term(artwork.kiln, locale, artwork.kilnEnglish)}</p>
                  <p className="text-sm text-[#666] dark:text-[#9a9894] font-serif-en">{artwork.kilnEnglish}</p>
                </div>}
                {artwork.dimensions && <div>
                  <h2 className="text-xs tracking-widest text-[#999] dark:text-[#6e6c68] uppercase mb-1">{t('dimensions')}</h2>
                  <p className="text-sm text-[#666] dark:text-[#9a9894]">{artwork.dimensions}</p>
                </div>}
              </div>

              <div className="divider-elegant !mx-0 !my-8" />

              <div className="mb-8">
                <h2 className="text-xs tracking-widest text-[#999] dark:text-[#6e6c68] uppercase mb-3">{t('collectionInfo')}</h2>
                <div className="space-y-2">
                  <p className="text-[#1a1a1a] dark:text-[#e8e6e3]">{museumName(artwork, locale)}</p>
                  <p className="text-sm text-[#666] dark:text-[#9a9894] font-serif-en">{artwork.sourceMuseumEnglish}</p>
                  <p className="text-sm text-[#999] dark:text-[#6e6c68]">{t('accession')}: {artwork.accessionNumber}</p>
                  {artwork.creditLine && <p className="text-sm text-[#999] dark:text-[#6e6c68]">{artwork.creditLine}</p>}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <ArtworkSlideshowButton currentArtworkId={artwork.id} />
                <TVModeLink href={`/tv/?start=${encodeURIComponent(artwork.id)}`} className="btn-elegant inline-flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {t('tv')}
                </TVModeLink>
                <a href={artwork.sourceUrl} target="_blank" rel="noopener noreferrer" className="btn-elegant inline-flex items-center gap-2">
                  {t('viewMuseum')}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-[#f5f3ef] dark:bg-[#171614] border-t border-[#ebe8e1] dark:border-[#252320]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex justify-between items-center gap-4">
            {previousArtwork ? <Link
              href={`/artwork/${encodeURIComponent(previousArtwork.id)}/`}
              className="group flex items-center gap-3 text-[#666] dark:text-[#9a9894] hover:text-[#1a1a1a] dark:hover:text-[#e8e6e3] transition-colors"
            >
              <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-left">
                <span className="block text-xs text-[#999] dark:text-[#6e6c68]">{t('prev')}</span>
                <span className="block text-sm">{artworkTitle(previousArtwork, locale)}</span>
              </span>
            </Link> : <div />}
            <Link href="/gallery/" className="text-sm text-[#b8956c] dark:text-[#d4b896] hover:text-[#1a1a1a] dark:hover:text-[#e8e6e3] transition-colors">
              {t('backGallery')}
            </Link>
            {nextArtwork ? <Link
              href={`/artwork/${encodeURIComponent(nextArtwork.id)}/`}
              className="group flex items-center gap-3 text-[#666] dark:text-[#9a9894] hover:text-[#1a1a1a] dark:hover:text-[#e8e6e3] transition-colors"
            >
              <span className="text-right">
                <span className="block text-xs text-[#999] dark:text-[#6e6c68]">{t('next')}</span>
                <span className="block text-sm">{artworkTitle(nextArtwork, locale)}</span>
              </span>
              <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link> : <div />}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
