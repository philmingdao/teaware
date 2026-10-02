'use client';

import { useLanguage } from './LanguageProvider';
import { artworkTitle, artworkDescription, term, museumName } from '@/lib/i18n';
import { artworks } from '@/data/artworks';
import ArtifactImage from './ArtifactImage';
import Link from '@/components/LocaleLink';
import { Monitor } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { heroArtworks } from '@/data/hero-artworks';
import TVModeLink from './TVModeLink';

export default function Hero() {
  const { locale, t } = useLanguage();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [interacting, setInteracting] = useState(false);
  const artwork = heroArtworks[index];
  const record = artworks.find(item => item.id === artwork.id)!;
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!playing || interacting || media.matches) return;
    const timer = window.setInterval(() => setIndex(i => (i + 1) % heroArtworks.length), 10000);
    return () => window.clearInterval(timer);
  }, [playing, interacting, index]);
  const move = (step: number) => setIndex(i => (i + step + heroArtworks.length) % heroArtworks.length);
  return (
    <section className="collection-surface relative min-h-screen flex items-center">
      
      <div className="relative max-w-7xl mx-auto px-6 lg:px-12 py-32 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Text Content */}
          <div className="order-2 lg:order-1">
            <div className="animate-fade-in opacity-0" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
              <span className="text-sm tracking-[0.3em] text-[#b8956c] dark:text-[#d4b896] uppercase font-serif-en">
                East Asian Teaware Art Exhibition
              </span>
            </div>
            
            <h1 className="mt-6 animate-fade-in opacity-0" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
              <span className={`block ${locale === 'en' ? 'text-5xl md:text-6xl' : 'text-6xl md:text-7xl lg:text-8xl'} font-medium tracking-wider text-[#1a1a1a] dark:text-[#e8e6e3]`}>
                {t('brand')}
              </span>
              <span className="block mt-4 text-xl md:text-2xl text-[#666] dark:text-[#9a9894] font-light tracking-wide">
                {t('siteTitle')}
              </span>
            </h1>

            <div className="mt-8 animate-fade-in opacity-0" style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}>
              <p className="text-[#3d3d3d] dark:text-[#c5c3bf] leading-relaxed max-w-lg">
                {t('heroIntro')}
              </p>
            </div>

            <div className="mt-10 flex flex-wrap gap-4 animate-fade-in opacity-0" style={{ animationDelay: '0.8s', animationFillMode: 'forwards' }}>
              <Link 
                href="/gallery" 
                className="btn-elegant"
              >
                {t('enter')}
              </Link>
              <TVModeLink
                href="/tv" 
                className="btn-elegant !bg-[#1a1a1a] dark:!bg-[#e8e6e3] !text-[#faf9f7] dark:!text-[#0f0f0e] hover:!bg-[#333] dark:hover:!bg-[#c5c3bf] !border-[#1a1a1a] dark:!border-[#e8e6e3]"
              >
                <span className="flex items-center gap-2">
                  <Monitor size={16} weight="light" />
                  {t('tv')}
                </span>
              </TVModeLink>
              <Link 
                href="/about" 
                className="btn-elegant !border-[#b8956c] !text-[#b8956c] hover:!bg-[#b8956c] hover:!text-[#faf9f7] dark:!border-[#d4b896] dark:!text-[#d4b896] dark:hover:!bg-[#d4b896] dark:hover:!text-[#0f0f0e]"
              >
                {t('about')}
              </Link>
            </div>
          </div>

          <div className="order-1 lg:order-2 animate-fade-in opacity-0" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}
            onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}
            onFocusCapture={() => setInteracting(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) setInteracting(false); }}>
            <figure>
              <div className="relative aspect-square max-w-lg mx-auto" aria-label={(locale === 'zh' ? artwork.titleChinese : artworkTitle(record, locale))}>
                {heroArtworks.map((item, i) => (
                  <div key={item.id} aria-hidden={i !== index}
                    className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${i === index ? 'opacity-100' : 'opacity-0'}`}>
                    <ArtifactImage id={item.id} src={item.imageUrl} alt={i === index ? (locale === 'zh' ? artwork.titleChinese : artworkTitle(record, locale)) : ''}
                      priority={i === 0} sizes="(max-width: 768px) 90vw, 512px" />
                  </div>
                ))}
              </div>
              <figcaption className="mt-4 text-center min-h-44 max-w-lg mx-auto">
                <h2 className="text-xl text-[#3d3d3d] dark:text-[#e8e6e3]">{(locale === 'zh' ? artwork.titleChinese : artworkTitle(record, locale))}</h2>
                <p className="text-xs text-[#777] dark:text-[#9a9894] mt-1 font-serif-en">{artwork.titleEnglish}</p>
                <p className="text-sm text-[#b8956c] dark:text-[#d4b896] mt-3">{record.date} · {term(record.material, locale, record.materialEnglish)}</p>
                <p className="text-sm leading-relaxed text-[#666] dark:text-[#aaa7a1] mt-3">{locale === 'zh' ? artwork.description : artworkDescription(record, locale)}</p>
                <a href={artwork.sourceUrl} target="_blank" rel="noreferrer" className="inline-block mt-2 text-xs text-[#777] dark:text-[#9a9894] underline underline-offset-4">{museumName(record, locale)} · {artwork.accessionNumber}</a>
              </figcaption>
            </figure>
            <div className="mt-5 flex items-center justify-center gap-5 text-[#666] dark:text-[#c5c3bf]">
              <button type="button" onClick={() => move(-1)} aria-label={t('prevHero')} className="p-2 hover:text-[#b8956c]">←</button>
              <span className="text-xs tabular-nums" aria-live="off">{String(index + 1).padStart(2, '0')} / {heroArtworks.length}</span>
              <button type="button" onClick={() => move(1)} aria-label={t('nextHero')} className="p-2 hover:text-[#b8956c]">→</button>
              <button type="button" onClick={() => setPlaying(p => !p)} aria-label={t(playing ? 'pauseHero' : 'playHero')} aria-pressed={!playing} className="text-xs p-2 hover:text-[#b8956c]">{t(playing ? 'pause' : 'play')}</button>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <svg 
          className="w-6 h-6 text-[#b8956c] dark:text-[#d4b896]" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M19 14l-7 7m0 0l-7-7m7 7V3" 
          />
        </svg>
      </div>
    </section>
  );
}
