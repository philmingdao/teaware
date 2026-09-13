'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { artworks } from '@/data/artworks';
import Link from 'next/link';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import MuteToggle from './MuteToggle';
import { withBasePath } from '@/lib/paths';

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
  const [musicStarted, setMusicStarted] = useState(false);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const uiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoplayRef = useRef<NodeJS.Timeout | null>(null);
  
  const { isMuted, toggleMute, startMusic, stopMusic } = useBackgroundMusic();

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
    if (!musicStarted) {
      startMusic();
      setMusicStarted(true);
    }
    setIsPlaying(prev => !prev);
    showUITemporarily();
  }, [showUITemporarily, musicStarted, startMusic]);

  const handleFirstInteraction = useCallback(() => {
    if (!musicStarted) {
      startMusic();
      setMusicStarted(true);
    }
  }, [musicStarted, startMusic]);

  useEffect(() => {
    return () => {
      stopMusic();
    };
  }, [stopMusic]);

  useEffect(() => {
    if (isPlaying) {
      autoplayRef.current = setInterval(goNext, 8000);
      uiTimeoutRef.current = setTimeout(() => setShowUI(false), 4000);
    } else {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowUI(true);
    }
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
      if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    };
  }, [isPlaying, goNext]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      handleFirstInteraction();
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
        case 'm':
        case 'M':
          toggleMute();
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
  }, [goNext, goPrev, router, showUITemporarily, toggleAutoplay, isPlaying, handleFirstInteraction, toggleMute]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.backgroundColor = '#000';
    return () => {
      document.body.style.overflow = '';
      document.body.style.backgroundColor = '';
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('a, button')) return;
    handleFirstInteraction();
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
    handleFirstInteraction();
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
      <div className="fixed inset-0 bg-black flex items-center justify-center">
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
      className="fixed inset-0 bg-black select-none overflow-hidden"
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
      {/* Full-bleed Background Image - Netflix Billboard Style */}
      <div 
        className="absolute inset-0"
        style={{
          transform: `translateX(${dragOffset * 0.1}px) scale(${isDragging ? 1.02 : 1})`,
          transition: isDragging ? 'none' : 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* Loading State */}
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
            <div className="w-12 h-12 border-2 border-white/10 border-t-[#d4b896]/60 rounded-full animate-spin" />
          </div>
        )}
        
        {/* Error State */}
        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
            <div className="text-white/40 text-center">
              <svg className="w-20 h-20 mx-auto mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-lg">图片加载失败</p>
            </div>
          </div>
        )}
        
        {/* Main Image - Full Bleed Cover */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={current.id}
          src={withBasePath(current.imageUrl)}
          alt={current.imageAlt}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          referrerPolicy="no-referrer"
          draggable={false}
        />
        
        {/* Cinematic Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />
      </div>

      {/* Netflix-style Title Card - Bottom Left */}
      <div
        className={`absolute bottom-0 left-0 right-0 transition-all duration-700 ease-out ${
          showUI ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
        }`}
        style={{ 
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 2rem)',
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 2rem)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 2rem)',
        }}
      >
        <div className="max-w-4xl px-4 md:px-8 lg:px-12 pb-8 md:pb-12">
          {/* Dynasty Badge */}
          <div className="mb-4">
            <span className="inline-flex items-center px-3 py-1 bg-[#d4b896]/20 backdrop-blur-sm border border-[#d4b896]/30 text-[#d4b896] text-sm tracking-widest">
              {current.dynasty}代
            </span>
          </div>
          
          {/* Title - Large Cinematic Typography */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-medium text-white tracking-wider leading-[1.1] mb-4 drop-shadow-2xl">
            {current.titleChinese}
          </h1>
          
          {/* English Title */}
          <p className="text-lg sm:text-xl md:text-2xl text-white/60 font-serif-en mb-6 drop-shadow-lg">
            {current.titleEnglish}
          </p>
          
          {/* Metadata Line - Clean & Minimal */}
          <div className="flex flex-wrap items-center gap-3 text-sm sm:text-base text-white/40">
            <span>{current.material}</span>
            <span className="w-1 h-1 rounded-full bg-white/30" />
            <span>{current.objectType}</span>
            <span className="w-1 h-1 rounded-full bg-white/30" />
            <span className="text-white/30">{current.sourceMuseum}</span>
          </div>
          
          {/* Progress Bar - Subtle */}
          <div className="mt-8 flex items-center gap-4">
            <div className="flex-1 max-w-xs h-0.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#d4b896]/60 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
              />
            </div>
            <span className="text-sm text-white/30 font-serif-en tabular-nums">
              {currentIndex + 1} / {total}
            </span>
          </div>
        </div>
      </div>

      {/* Top Bar - Minimal Controls */}
      <div
        className={`absolute top-0 left-0 right-0 transition-all duration-700 ease-out ${
          showUI ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'
        }`}
        style={{ 
          paddingTop: 'max(env(safe-area-inset-top, 0px), 1rem)',
          paddingLeft: 'max(env(safe-area-inset-left, 0px), 1rem)',
          paddingRight: 'max(env(safe-area-inset-right, 0px), 1rem)',
        }}
      >
        <div className="flex items-center justify-between px-4 md:px-8 lg:px-12 py-4">
          {/* Back Button */}
          <Link
            href="/gallery"
            className="group flex items-center gap-2 text-white/50 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline text-sm tracking-wide">返回</span>
          </Link>

          {/* Logo */}
          <Link href="/" className="text-white/40 hover:text-white/60 transition-colors">
            <span className="text-lg tracking-widest">器 · 茶</span>
          </Link>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <MuteToggle isMuted={isMuted} onToggle={toggleMute} className="text-white/50 hover:text-white" />
            <button
              onClick={toggleAutoplay}
              className="flex items-center gap-2 text-white/50 hover:text-white transition-colors"
            >
              <span className="hidden sm:inline text-sm tracking-wide">
                {isPlaying ? '暂停' : '播放'}
              </span>
              {isPlaying ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 9v6m4-6v6" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Side Navigation - Desktop */}
      <button
        onClick={() => { if (isPlaying) setIsPlaying(false); goPrev(); }}
        className={`hidden lg:flex absolute left-4 xl:left-8 top-1/2 -translate-y-1/2 w-14 h-14 items-center justify-center text-white/20 hover:text-white/60 hover:bg-white/5 rounded-full transition-all duration-500 ${
          showUI ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <button
        onClick={() => { if (isPlaying) setIsPlaying(false); goNext(); }}
        className={`hidden lg:flex absolute right-4 xl:right-8 top-1/2 -translate-y-1/2 w-14 h-14 items-center justify-center text-white/20 hover:text-white/60 hover:bg-white/5 rounded-full transition-all duration-500 ${
          showUI ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Mobile Swipe Hint */}
      <div className={`lg:hidden absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 pointer-events-none transition-opacity duration-700 ${
        showUI && currentIndex === 0 && !isPlaying ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="flex items-center gap-4 text-white/20">
          <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">滑动浏览</span>
          <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* Keyboard Hints - Desktop */}
      <div className={`hidden lg:flex absolute bottom-6 right-8 items-center gap-4 text-xs text-white/15 transition-opacity duration-500 ${
        showUI ? 'opacity-100' : 'opacity-0'
      }`}>
        <span className="flex items-center gap-1">
          <kbd className="px-2 py-1 bg-white/5 rounded text-[10px]">←</kbd>
          <kbd className="px-2 py-1 bg-white/5 rounded text-[10px]">→</kbd>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-2 py-1 bg-white/5 rounded text-[10px]">P</kbd>
          <span className="ml-1">播放</span>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-2 py-1 bg-white/5 rounded text-[10px]">M</kbd>
          <span className="ml-1">静音</span>
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-2 py-1 bg-white/5 rounded text-[10px]">ESC</kbd>
          <span className="ml-1">退出</span>
        </span>
      </div>
    </div>
  );
}
