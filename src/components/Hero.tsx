'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Monitor } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { heroArtworks } from '@/data/hero-artworks';
import { withBasePath } from '@/lib/paths';
import TVModeLink from './TVModeLink';

export default function Hero() {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [interacting, setInteracting] = useState(false);
  const artwork = heroArtworks[index];
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!playing || interacting || media.matches) return;
    const timer = window.setInterval(() => setIndex(i => (i + 1) % heroArtworks.length), 10000);
    return () => window.clearInterval(timer);
  }, [playing, interacting, index]);
  const move = (step: number) => setIndex(i => (i + step + heroArtworks.length) % heroArtworks.length);
  return (
    <section className="relative min-h-screen flex items-center">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#f5f3ef] to-[#faf9f7] dark:from-[#171614] dark:to-[#0f0f0e]"></div>
      
      <div className="relative max-w-7xl mx-auto px-6 lg:px-12 py-32 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Text Content */}
          <div className="order-2 lg:order-1">
            <div className="animate-fade-in opacity-0" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
              <span className="text-sm tracking-[0.3em] text-[#b8956c] dark:text-[#d4b896] uppercase font-serif-en">
                Chinese Tea Ware Gallery
              </span>
            </div>
            
            <h1 className="mt-6 animate-fade-in opacity-0" style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
              <span className="block text-6xl md:text-7xl lg:text-8xl font-medium tracking-wider text-[#1a1a1a] dark:text-[#e8e6e3]">
                器 · 茶
              </span>
              <span className="block mt-4 text-xl md:text-2xl text-[#666] dark:text-[#9a9894] font-light tracking-wide">
                中国茶具艺术展
              </span>
            </h1>

            <div className="mt-8 animate-fade-in opacity-0" style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}>
              <p className="text-[#3d3d3d] dark:text-[#c5c3bf] leading-relaxed max-w-lg">
                自唐宋以降，茶道兴盛，茶器亦随之臻于至美。建盏之黑，青瓷之润，紫砂之朴，皆承载着千年的文人雅趣与匠心传承。此展精选大都会艺术博物馆与克利夫兰艺术博物馆珍藏茶器，邀君共赏器物之美，体悟茶道精神。
              </p>
            </div>

            <div className="mt-10 flex flex-wrap gap-4 animate-fade-in opacity-0" style={{ animationDelay: '0.8s', animationFillMode: 'forwards' }}>
              <Link 
                href="/gallery" 
                className="btn-elegant"
              >
                进入展厅
              </Link>
              <TVModeLink
                href="/tv" 
                className="btn-elegant !bg-[#1a1a1a] dark:!bg-[#e8e6e3] !text-[#faf9f7] dark:!text-[#0f0f0e] hover:!bg-[#333] dark:hover:!bg-[#c5c3bf] !border-[#1a1a1a] dark:!border-[#e8e6e3]"
              >
                <span className="flex items-center gap-2">
                  <Monitor size={16} weight="light" />
                  电视模式
                </span>
              </TVModeLink>
              <Link 
                href="/about" 
                className="btn-elegant !border-[#b8956c] !text-[#b8956c] hover:!bg-[#b8956c] hover:!text-[#faf9f7] dark:!border-[#d4b896] dark:!text-[#d4b896] dark:hover:!bg-[#d4b896] dark:hover:!text-[#0f0f0e]"
              >
                关于展览
              </Link>
            </div>
          </div>

          <div className="order-1 lg:order-2 animate-fade-in opacity-0" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}
            onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)}
            onFocusCapture={() => setInteracting(true)} onBlurCapture={e => { if (!e.currentTarget.contains(e.relatedTarget)) setInteracting(false); }}>
            <figure>
              <div className="relative aspect-square max-w-lg mx-auto" aria-label={artwork.titleChinese}>
                {heroArtworks.map((item, i) => (
                  <Image key={item.id} src={withBasePath(item.imageUrl)} alt={i === index ? item.titleChinese : ''}
                    aria-hidden={i !== index} fill priority={i === 0} sizes="(max-width: 768px) 90vw, 512px"
                    className={`object-contain p-5 transition-opacity duration-700 motion-reduce:transition-none ${i === index ? 'opacity-100' : 'opacity-0'}`} />
                ))}
              </div>
              <figcaption className="mt-4 text-center min-h-44 max-w-lg mx-auto">
                <h2 className="text-xl text-[#3d3d3d] dark:text-[#e8e6e3]">{artwork.titleChinese}</h2>
                <p className="text-xs text-[#777] dark:text-[#9a9894] mt-1 font-serif-en">{artwork.titleEnglish}</p>
                <p className="text-sm text-[#b8956c] dark:text-[#d4b896] mt-3">{artwork.date} · {artwork.material}</p>
                <p className="text-sm leading-relaxed text-[#666] dark:text-[#aaa7a1] mt-3">{artwork.description}</p>
                <a href={artwork.sourceUrl} target="_blank" rel="noreferrer" className="inline-block mt-2 text-xs text-[#777] dark:text-[#9a9894] underline underline-offset-4">{artwork.museum} · {artwork.accessionNumber}</a>
              </figcaption>
            </figure>
            <div className="mt-5 flex items-center justify-center gap-5 text-[#666] dark:text-[#c5c3bf]">
              <button type="button" onClick={() => move(-1)} aria-label="上一件封面作品" className="p-2 hover:text-[#b8956c]">←</button>
              <span className="text-xs tabular-nums" aria-live="off">{String(index + 1).padStart(2, '0')} / {heroArtworks.length}</span>
              <button type="button" onClick={() => move(1)} aria-label="下一件封面作品" className="p-2 hover:text-[#b8956c]">→</button>
              <button type="button" onClick={() => setPlaying(p => !p)} aria-label={playing ? '暂停封面轮换' : '继续封面轮换'} aria-pressed={!playing} className="text-xs p-2 hover:text-[#b8956c]">{playing ? '暂停' : '播放'}</button>
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
