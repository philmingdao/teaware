'use client';

import Image from 'next/image';
import Link from 'next/link';
import { featuredArtwork } from '@/data/artworks';

export default function Hero() {
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
              <Link 
                href="/tv" 
                className="btn-elegant !bg-[#1a1a1a] dark:!bg-[#e8e6e3] !text-[#faf9f7] dark:!text-[#0f0f0e] hover:!bg-[#333] dark:hover:!bg-[#c5c3bf] !border-[#1a1a1a] dark:!border-[#e8e6e3]"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  电视模式
                </span>
              </Link>
              <Link 
                href="/about" 
                className="btn-elegant !border-[#b8956c] !text-[#b8956c] hover:!bg-[#b8956c] hover:!text-[#faf9f7] dark:!border-[#d4b896] dark:!text-[#d4b896] dark:hover:!bg-[#d4b896] dark:hover:!text-[#0f0f0e]"
              >
                关于展览
              </Link>
            </div>
          </div>

          {/* Featured Image */}
          <div className="order-1 lg:order-2 animate-fade-in opacity-0" style={{ animationDelay: '0.3s', animationFillMode: 'forwards' }}>
            <div className="relative">
              <div className="relative aspect-square max-w-lg mx-auto">
                <div className="absolute inset-0 bg-[#ebe8e1] dark:bg-[#252320] rounded-sm transform rotate-3"></div>
                <div className="relative aspect-square overflow-hidden rounded-sm shadow-2xl dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
                  <Image
                    src={featuredArtwork.imageUrl}
                    alt={featuredArtwork.imageAlt}
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                </div>
              </div>
              
              {/* Caption */}
              <div className="mt-6 text-center">
                <p className="text-sm text-[#666] dark:text-[#9a9894]">
                  {featuredArtwork.titleChinese}
                </p>
                <p className="text-xs text-[#999] dark:text-[#6e6c68] mt-1 font-serif-en">
                  {featuredArtwork.titleEnglish}
                </p>
                <p className="text-xs text-[#b8956c] dark:text-[#d4b896] mt-2">
                  {featuredArtwork.dynastyEnglish}
                </p>
              </div>
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
