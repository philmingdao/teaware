'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Artwork } from '@/types/artwork';
import ResilientImage from './ResilientImage';
import MuteToggle from './MuteToggle';
import { useSlideshowContext } from './SlideshowProvider';

interface SlideshowProps {
  artworks: Artwork[];
  startIndex?: number;
  onClose: () => void;
}

export default function Slideshow({ artworks, startIndex = 0, onClose }: SlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoplayIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();
  
  const { isMuted, toggleMute } = useSlideshowContext();

  const currentArtwork = artworks[currentIndex];
  const totalCount = artworks.length;

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalCount);
  }, [totalCount]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalCount) % totalCount);
  }, [totalCount]);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  }, [isPlaying]);

  const toggleAutoplay = useCallback(() => {
    setIsPlaying((prev) => !prev);
    showControlsTemporarily();
  }, [showControlsTemporarily]);

  const handleInteraction = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
    }
    showControlsTemporarily();
  }, [isPlaying, showControlsTemporarily]);

  useEffect(() => {
    if (isPlaying) {
      autoplayIntervalRef.current = setInterval(goToNext, 5000);
    } else {
      if (autoplayIntervalRef.current) {
        clearInterval(autoplayIntervalRef.current);
      }
    }
    return () => {
      if (autoplayIntervalRef.current) {
        clearInterval(autoplayIntervalRef.current);
      }
    };
  }, [isPlaying, goToNext]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      handleInteraction();
      switch (e.key) {
        case 'ArrowLeft':
          goToPrev();
          break;
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          goToNext();
          break;
        case 'Escape':
          onClose();
          break;
        case 'p':
          toggleAutoplay();
          break;
        case 'm':
        case 'M':
          toggleMute();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, onClose, handleInteraction, toggleAutoplay, toggleMute]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    handleInteraction();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStart.x;
    setDragOffset(deltaX);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (Math.abs(dragOffset) > 80) {
      if (dragOffset > 0) {
        goToPrev();
      } else {
        goToNext();
      }
    }
    setDragOffset(0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    handleInteraction();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaX = e.touches[0].clientX - dragStart.x;
    setDragOffset(deltaX);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (Math.abs(dragOffset) > 50) {
      if (dragOffset > 0) {
        goToPrev();
      } else {
        goToNext();
      }
    }
    setDragOffset(0);
  };

  const handleViewDetails = () => {
    onClose();
    router.push(`/artwork/${currentArtwork.id}`);
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-[#1a1a1a] select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseMoveCapture={showControlsTemporarily}
    >
      {/* Main Image */}
      <div 
        className="absolute inset-0 flex items-center justify-center p-4 sm:p-8 md:p-16 lg:p-24"
        style={{
          transform: `translateX(${dragOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
      >
        <div className="relative w-full h-full max-w-6xl mx-auto">
          <ResilientImage
            src={currentArtwork.imageUrl}
            alt={currentArtwork.imageAlt}
            fill
            objectFit="contain"
            sizes="100vw"
            priority
          />
        </div>
      </div>

      {/* Wall Label Overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent transition-opacity duration-500 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-8 pb-6 sm:pb-8 pt-16 sm:pt-24">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-medium text-white tracking-wider line-clamp-2">
                {currentArtwork.titleChinese}
              </h2>
              <p className="mt-1 text-sm sm:text-base text-white/80 font-serif-en line-clamp-1">
                {currentArtwork.titleEnglish}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm text-white/60">
                <span className="text-[#d4b896]">{currentArtwork.dynasty}代</span>
                <span>·</span>
                <span>{currentArtwork.material}</span>
                <span>·</span>
                <span>{currentArtwork.sourceMuseum}</span>
              </div>
            </div>
            <button
              onClick={handleViewDetails}
              className="shrink-0 px-4 py-2 text-sm border border-white/30 text-white/80 hover:bg-white/10 hover:text-white transition-colors rounded"
            >
              查看详情
            </button>
          </div>
        </div>
      </div>

      {/* Top Controls */}
      <div
        className={`absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent transition-opacity duration-500 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-6">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="hidden sm:inline text-sm">退出幻灯</span>
          </button>
          
          <div className="text-sm text-white/60">
            {currentIndex + 1} / {totalCount}
          </div>
          
          <div className="flex items-center gap-4">
            <MuteToggle isMuted={isMuted} onToggle={toggleMute} />
            <button
              onClick={toggleAutoplay}
              className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              {isPlaying ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="hidden sm:inline text-sm">暂停</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="hidden sm:inline text-sm">自动播放</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Side Navigation Arrows (Desktop) */}
      <button
        onClick={() => { handleInteraction(); goToPrev(); }}
        className={`hidden md:flex absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 w-12 h-12 items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <button
        onClick={() => { handleInteraction(); goToNext(); }}
        className={`hidden md:flex absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 w-12 h-12 items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Swipe Hint (Mobile) */}
      <div className={`md:hidden absolute left-1/2 -translate-x-1/2 bottom-32 text-xs text-white/40 transition-opacity duration-500 ${
        showControls && currentIndex === 0 ? 'opacity-100' : 'opacity-0'
      }`}>
        ← 左右滑动切换 →
      </div>

      {/* Keyboard Hints (Desktop) */}
      <div className={`hidden lg:block absolute bottom-4 left-4 text-xs text-white/30 transition-opacity duration-500 ${
        showControls ? 'opacity-100' : 'opacity-0'
      }`}>
        <span className="inline-flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">←</kbd>
          <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">→</kbd>
          <span className="ml-1">切换</span>
        </span>
        <span className="mx-2">·</span>
        <span className="inline-flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">P</kbd>
          <span className="ml-1">自动播放</span>
        </span>
        <span className="mx-2">·</span>
        <span className="inline-flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">M</kbd>
          <span className="ml-1">静音</span>
        </span>
        <span className="mx-2">·</span>
        <span className="inline-flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-[10px]">ESC</kbd>
          <span className="ml-1">退出</span>
        </span>
      </div>
    </div>
  );
}
