'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CaretLeft, CaretRight, Pause, Play, X } from '@phosphor-icons/react';
import type { Artwork } from '@/types/artwork';
import ResilientImage from './ResilientImage';
import MusicToggle from './MusicToggle';

interface SlideshowProps {
  artworks: Artwork[];
  startIndex?: number;
  onClose: () => void;
}

export default function Slideshow({ artworks, startIndex = 0, onClose }: SlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const autoplayIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  const totalCount = artworks.length;
  const currentArtwork = artworks[currentIndex];

  const goToNext = useCallback(() => {
    setCurrentIndex((previous) => (previous + 1) % totalCount);
  }, [totalCount]);

  const goToPrev = useCallback(() => {
    setCurrentIndex((previous) => (previous - 1 + totalCount) % totalCount);
  }, [totalCount]);

  const pauseAndGo = useCallback((direction: 'next' | 'previous') => {
    setIsAutoPlaying(false);
    if (direction === 'next') goToNext();
    else goToPrev();
  }, [goToNext, goToPrev]);

  useEffect(() => {
    if (isAutoPlaying) autoplayIntervalRef.current = setInterval(goToNext, 6000);
    return () => {
      if (autoplayIntervalRef.current) clearInterval(autoplayIntervalRef.current);
    };
  }, [goToNext, isAutoPlaying]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowLeft':
          pauseAndGo('previous');
          break;
        case 'ArrowRight':
        case ' ':
          event.preventDefault();
          pauseAndGo('next');
          break;
        case 'Escape':
          onClose();
          break;
        case 'p':
        case 'P':
          setIsAutoPlaying((playing) => !playing);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, pauseAndGo]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handlePointerDown = (event: React.PointerEvent) => {
    if ((event.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    setDragStart(event.clientX);
    setIsAutoPlaying(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (isDragging) setDragOffset(event.clientX - dragStart);
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    if (Math.abs(dragOffset) > 60) {
      if (dragOffset > 0) goToPrev();
      else goToNext();
    }
    setDragOffset(0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleViewDetails = () => {
    onClose();
    router.push(`/artwork/${currentArtwork.id}`);
  };

  if (!currentArtwork) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid min-h-[100dvh] grid-rows-[auto_minmax(0,1fr)_auto] select-none bg-[#121210] text-[#f0ede7]"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <header
        className="z-20 flex min-h-16 items-center justify-between border-b border-white/10 bg-[#181714]/95 px-4 py-3 sm:px-7"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 0.75rem)' }}
      >
        <button type="button" onClick={onClose} className="inline-flex items-center gap-2 text-white/65 transition-colors hover:text-white">
          <X size={20} weight="light" />
          <span className="hidden text-sm sm:inline">退出幻灯</span>
        </button>

        <span className="font-serif-en text-sm tabular-nums text-white/45">{currentIndex + 1} / {totalCount}</span>

        <div className="flex items-center gap-4">
          <MusicToggle className="text-white/60 hover:text-white" />
          <button
            type="button"
            onClick={() => setIsAutoPlaying((playing) => !playing)}
            className="inline-flex items-center gap-2 text-white/60 transition-colors hover:text-white"
            aria-label={isAutoPlaying ? '暂停幻灯' : '自动播放幻灯'}
          >
            {isAutoPlaying ? <Pause size={20} weight="light" /> : <Play size={20} weight="light" />}
            <span className="hidden text-sm sm:inline">{isAutoPlaying ? '暂停幻灯' : '自动播放'}</span>
          </button>
        </div>
      </header>

      <main
        className="relative min-h-0 w-full overflow-hidden bg-[#090908]"
        style={{
          transform: `translateX(${dragOffset}px)`,
          transition: isDragging ? 'none' : 'transform 300ms ease-out',
        }}
      >
        <ResilientImage
          key={currentArtwork.id}
          src={currentArtwork.imageUrl}
          alt={currentArtwork.imageAlt}
          fill
          objectFit="contain"
          sizes="100vw"
          priority
        />

        <button
          type="button"
          onClick={() => pauseAndGo('previous')}
          className="absolute left-3 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center border border-white/10 bg-black/35 text-white/60 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white md:flex"
          aria-label="上一件藏品"
        >
          <CaretLeft size={28} weight="light" />
        </button>
        <button
          type="button"
          onClick={() => pauseAndGo('next')}
          className="absolute right-3 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center border border-white/10 bg-black/35 text-white/60 backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white md:flex"
          aria-label="下一件藏品"
        >
          <CaretRight size={28} weight="light" />
        </button>
      </main>

      <footer
        className="z-20 flex h-32 items-center border-t border-white/10 bg-[#181714] px-5 py-4 sm:h-36 sm:px-8 sm:py-5"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 1rem)' }}
      >
        <div className="mx-auto flex w-full max-w-7xl items-end justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex min-w-0 items-center gap-x-3 overflow-hidden whitespace-nowrap text-xs tracking-[0.16em] text-[#d4b896]">
              <span className="shrink-0">{currentArtwork.dynasty}代</span>
              <span className="text-white/25">/</span>
              <span className="truncate text-white/45">{currentArtwork.material}</span>
              <span className="hidden text-white/25 sm:inline">/</span>
              <span className="hidden truncate text-white/45 sm:inline">{currentArtwork.sourceMuseum}</span>
            </div>
            <h2 className="truncate text-xl font-medium tracking-wider text-white sm:text-2xl">{currentArtwork.titleChinese}</h2>
            <p className="mt-1 truncate font-serif-en text-sm text-white/45 sm:text-base">{currentArtwork.titleEnglish}</p>
          </div>
          <button
            type="button"
            onClick={handleViewDetails}
            className="shrink-0 border border-white/20 px-4 py-2 text-sm text-white/65 transition-colors hover:border-white/45 hover:text-white"
          >
            查看详情
          </button>
        </div>
      </footer>
    </div>
  );
}
