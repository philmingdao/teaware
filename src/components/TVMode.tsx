'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { artworks } from '@/data/artworks';
import Link from 'next/link';

export default function TVMode() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const startId = searchParams.get('start');
  const filterMuseum = searchParams.get('museum');
  const filterDynasty = searchParams.get('dynasty');
  
  const filteredArtworks = artworks.filter(a => {
    if (filterMuseum && a.sourceMuseum !== filterMuseum) return false;
    if (filterDynasty && a.dynasty !== filterDynasty) return false;
    return true;
  });
  
  const initialIndex = startId 
    ? Math.max(0, filteredArtworks.findIndex(a => a.id === startId))
    : 0;
  
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const uiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);

  const current = filteredArtworks[currentIndex];
  const total = filteredArtworks.length;

  const goNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % total);
    setImageLoaded(false);
    setImageError(false);
  }, [total]);

  const goPrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + total) % total);
    setImageLoaded(false);
    setImageError(false);
  }, [total]);

  const showUITemporarily = useCallback(() => {
    setShowUI(true);
    if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    uiTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowUI(false);
    }, 4000);
  }, [isPlaying]);

  const toggleAutoplay = useCallback(() => {
    setIsPlaying(prev => !prev);
    showUITemporarily();
  }, [showUITemporarily]);

  useEffect(() => {
    if (isPlaying) {
      autoplayRef.current = setInterval(goNext, 6000);
      uiTimeoutRef.current = setTimeout(() => setShowUI(false), 4000);
    } else {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
      setShowUI(true);
    }
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
      if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    };
  }, [isPlaying, goNext]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      showUITemporarily();
      if (isPlaying && ['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        setIsPlaying(false);
      }
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          goNext();
          break;
        case 'ArrowLeft':
          goPrev();
          break;
        case 'Escape':
          router.push('/gallery');
          break;
        case 'p':
        case 'P':
          toggleAutoplay();
          break;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      showUITemporarily();
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        if (e.deltaX > 30) goNext();
        else if (e.deltaX < -30) goPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('wheel', handleWheel, { passive: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [goNext, goPrev, router, showUITemporarily, toggleAutoplay, isPlaying]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.backgroundColor = '#0a0a0a';
    return () => {
      document.body.style.overflow = '';
      document.body.style.backgroundColor = '';
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('a, button')) return;
    setIsDragging(true);
    setDragStart(e.clientX);
    showUITemporarily();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setDragOffset(e.clientX - dragStart);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (Math.abs(dragOffset) > 80) {
      if (isPlaying) setIsPlaying(false);
      if (dragOffset > 0) goPrev();
      else goNext();
    }
    setDragOffset(0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('a, button')) return;
    setIsDragging(true);
    setDragStart(e.touches[0].clientX);
    showUITemporarily();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    setDragOffset(e.touches[0].clientX - dragStart);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (Math.abs(dragOffset) > 60) {
      if (isPlaying) setIsPlaying(false);
      if (dragOffset > 0) goPrev();
      else goNext();
    }
    setDragOffset(0);
  };

  if (!current) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center text-white/60">
          <p className="text-xl">暂无藏品</p>
          <Link href="/gallery" className="mt-4 inline-block text-[#d4b896] hover:underline">
            返回画廊
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 bg-[#0a0a0a] select-none cursor-none overflow-hidden"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseMove={showUITemporarily}
      style={{ cursor: showUI ? 'default' : 'none' }}
    >
      {/* Artwork Image - Full Screen */}
      <div 
        className="absolute inset-0 flex items-center justify-center"
        style={{
          padding: 'env(safe-area-inset-top, 20px) env(safe-area-inset-right, 20px) env(safe-area-inset-bottom, 100px) env(safe-area-inset-left, 20px)',
          transform: `translateX(${dragOffset * 0.3}px)`,
          transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div className="relative w-full h-full max-w-[90vw] max-h-[85vh] flex items-center justify-center">
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            </div>
          )}
          {imageError ? (
            <div className="text-white/40 text-center">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p>图片加载失败</p>
            </div>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              key={current.id}
              src={current.imageUrl}
              alt={current.imageAlt}
              className={`max-w-full max-h-full object-contain transition-opacity duration-700 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              referrerPolicy="no-referrer"
              draggable={false}
            />
          )}
        </div>
      </div>

      {/* Caption Overlay - TV-optimized typography */}
      <div
        className={`absolute bottom-0 left-0 right-0 transition-all duration-700 ${
          showUI ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-24 pb-8 px-8 md:px-16">
          <div className="max-w-5xl mx-auto">
            {/* Title - Large for TV viewing */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-medium text-white tracking-wider leading-tight">
              {current.titleChinese}
            </h1>
            <p className="mt-2 text-lg sm:text-xl md:text-2xl text-white/70 font-serif-en">
              {current.titleEnglish}
            </p>
            
            {/* Metadata - Clean, spaced for readability */}
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-base sm:text-lg md:text-xl text-white/50">
              <span className="text-[#d4b896]">{current.dynasty}代</span>
              <span className="hidden sm:inline">·</span>
              <span>{current.material}</span>
              <span className="hidden sm:inline">·</span>
              <span className="text-white/40">{current.sourceMuseum}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Bar - Minimal controls */}
      <div
        className={`absolute top-0 left-0 right-0 transition-all duration-700 ${
          showUI ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="bg-gradient-to-b from-black/80 to-transparent py-6 px-8 md:px-16">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            {/* Back */}
            <Link
              href="/gallery"
              className="flex items-center gap-3 text-white/60 hover:text-white transition-colors text-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="hidden md:inline">退出展览</span>
            </Link>

            {/* Counter */}
            <div className="text-xl md:text-2xl text-white/40 font-light tracking-wider">
              <span className="text-white/70">{currentIndex + 1}</span>
              <span className="mx-2">/</span>
              <span>{total}</span>
            </div>

            {/* Autoplay */}
            <button
              onClick={toggleAutoplay}
              className="flex items-center gap-3 text-white/60 hover:text-white transition-colors text-lg"
            >
              {isPlaying ? (
                <>
                  <span className="hidden md:inline">暂停</span>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 9v6m4-6v6" />
                  </svg>
                </>
              ) : (
                <>
                  <span className="hidden md:inline">自动播放</span>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Side Navigation - Desktop only */}
      <button
        onClick={() => { if (isPlaying) setIsPlaying(false); goPrev(); }}
        className={`hidden lg:flex absolute left-8 top-1/2 -translate-y-1/2 w-16 h-16 items-center justify-center text-white/30 hover:text-white/80 transition-all duration-500 ${
          showUI ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <button
        onClick={() => { if (isPlaying) setIsPlaying(false); goNext(); }}
        className={`hidden lg:flex absolute right-8 top-1/2 -translate-y-1/2 w-16 h-16 items-center justify-center text-white/30 hover:text-white/80 transition-all duration-500 ${
          showUI ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Mobile swipe hint */}
      <div className={`lg:hidden absolute left-1/2 -translate-x-1/2 bottom-40 text-sm text-white/20 transition-opacity duration-700 ${
        showUI && currentIndex === 0 ? 'opacity-100' : 'opacity-0'
      }`}>
        ← 滑动切换 →
      </div>

      {/* Keyboard hints - Desktop only */}
      <div className={`hidden lg:block absolute bottom-6 left-8 text-xs text-white/20 transition-opacity duration-500 ${
        showUI ? 'opacity-100' : 'opacity-0'
      }`}>
        <kbd className="px-2 py-1 bg-white/10 rounded mr-1">←</kbd>
        <kbd className="px-2 py-1 bg-white/10 rounded mr-3">→</kbd>
        切换
        <span className="mx-3">|</span>
        <kbd className="px-2 py-1 bg-white/10 rounded mr-1">P</kbd>
        播放
        <span className="mx-3">|</span>
        <kbd className="px-2 py-1 bg-white/10 rounded">ESC</kbd>
        退出
      </div>
    </div>
  );
}
