'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CaretLeft, CaretRight, Pause, Play } from '@phosphor-icons/react';
import { artworks } from '@/data/artworks';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import { withBasePath } from '@/lib/paths';
import MusicToggle from './MusicToggle';

type Direction = 1 | -1;

export default function TVMode() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startMusic, stopMusic, toggleMusic } = useBackgroundMusic();

  const startId = searchParams.get('start');
  const filterMuseum = searchParams.get('museum');
  const filterDynasty = searchParams.get('dynasty');

  const filteredArtworks = useMemo(() => artworks.filter((artwork) => {
    if (filterMuseum && artwork.sourceMuseum !== filterMuseum) return false;
    if (filterDynasty && artwork.dynasty !== filterDynasty) return false;
    return true;
  }), [filterDynasty, filterMuseum]);

  const initialIndex = useMemo(() => {
    if (!startId) return 0;
    return Math.max(0, filteredArtworks.findIndex((artwork) => artwork.id === startId));
  }, [filteredArtworks, startId]);

  const [targetIndex, setTargetIndex] = useState(initialIndex);
  const [displayedIndex, setDisplayedIndex] = useState<number | null>(null);
  const [imageVisible, setImageVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [allImagesBroken, setAllImagesBroken] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  const brokenArtworkIdsRef = useRef(new Set<string>());
  const uiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const detailsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const total = filteredArtworks.length;
  const visibleIndex = displayedIndex ?? 0;
  const displayedArtwork = displayedIndex === null ? null : filteredArtworks[displayedIndex];

  const findAvailableIndex = useCallback((fromIndex: number, direction: Direction) => {
    for (let step = 1; step < total; step += 1) {
      const candidate = (fromIndex + direction * step + total) % total;
      if (!brokenArtworkIdsRef.current.has(filteredArtworks[candidate].id)) return candidate;
    }
    return null;
  }, [filteredArtworks, total]);

  const queueIndex = useCallback((nextIndex: number) => {
    setDetailsVisible(false);
    setTargetIndex(nextIndex);
  }, []);

  const goNext = useCallback(() => {
    const nextIndex = findAvailableIndex(targetIndex, 1);
    if (nextIndex !== null) queueIndex(nextIndex);
  }, [findAvailableIndex, queueIndex, targetIndex]);

  const goPrev = useCallback(() => {
    const previousIndex = findAvailableIndex(targetIndex, -1);
    if (previousIndex !== null) queueIndex(previousIndex);
  }, [findAvailableIndex, queueIndex, targetIndex]);

  const pauseAndGo = useCallback((direction: Direction) => {
    setIsAutoPlaying(false);
    if (direction === 1) goNext();
    else goPrev();
  }, [goNext, goPrev]);

  const skipBrokenTarget = useCallback((brokenIndex: number) => {
    const brokenArtwork = filteredArtworks[brokenIndex];
    if (!brokenArtwork) return;
    brokenArtworkIdsRef.current.add(brokenArtwork.id);
    const nextIndex = findAvailableIndex(brokenIndex, 1);
    if (nextIndex === null) {
      setAllImagesBroken(true);
      setIsAutoPlaying(false);
      return;
    }
    queueIndex(nextIndex);
  }, [filteredArtworks, findAvailableIndex, queueIndex]);

  useEffect(() => {
    startMusic();
    return () => stopMusic();
  }, [startMusic, stopMusic]);

  useEffect(() => {
    if (!total || allImagesBroken) return;
    const targetArtwork = filteredArtworks[targetIndex];
    if (!targetArtwork) return;

    let cancelled = false;
    const bufferedImage = new window.Image();
    bufferedImage.referrerPolicy = 'no-referrer';
    bufferedImage.onload = () => {
      void bufferedImage.decode().catch(() => undefined).then(() => {
        if (!cancelled) {
          setImageVisible(false);
          setDisplayedIndex(targetIndex);
        }
      });
    };
    bufferedImage.onerror = () => {
      if (!cancelled) skipBrokenTarget(targetIndex);
    };
    bufferedImage.src = withBasePath(targetArtwork.imageUrl);

    return () => {
      cancelled = true;
      bufferedImage.onload = null;
      bufferedImage.onerror = null;
    };
  }, [allImagesBroken, filteredArtworks, skipBrokenTarget, targetIndex, total]);

  useEffect(() => {
    if (!imageVisible) return;
    detailsTimeoutRef.current = setTimeout(() => setDetailsVisible(true), 420);
    return () => {
      if (detailsTimeoutRef.current) clearTimeout(detailsTimeoutRef.current);
    };
  }, [imageVisible]);

  useEffect(() => {
    if (displayedIndex === null || total < 2) return;
    const nextIndex = findAvailableIndex(displayedIndex, 1);
    if (nextIndex === null) return;
    const image = new window.Image();
    image.referrerPolicy = 'no-referrer';
    image.src = withBasePath(filteredArtworks[nextIndex].imageUrl);
  }, [displayedIndex, filteredArtworks, findAvailableIndex, total]);

  useEffect(() => {
    if (isAutoPlaying) {
      autoplayRef.current = setInterval(goNext, 8000);
      uiTimeoutRef.current = setTimeout(() => setShowUI(false), 4000);
    }
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
      if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    };
  }, [goNext, isAutoPlaying]);

  const showUITemporarily = useCallback(() => {
    setShowUI(true);
    if (uiTimeoutRef.current) clearTimeout(uiTimeoutRef.current);
    if (isAutoPlaying) uiTimeoutRef.current = setTimeout(() => setShowUI(false), 4000);
  }, [isAutoPlaying]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      showUITemporarily();
      switch (event.key) {
        case 'ArrowRight':
        case ' ':
          event.preventDefault();
          pauseAndGo(1);
          break;
        case 'ArrowLeft':
          pauseAndGo(-1);
          break;
        case 'Escape':
          router.push('/gallery');
          break;
        case 'p':
        case 'P':
          setIsAutoPlaying((playing) => !playing);
          break;
        case 'm':
        case 'M':
          toggleMusic();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pauseAndGo, router, showUITemporarily, toggleMusic]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.backgroundColor = '#050505';
    return () => {
      document.body.style.overflow = '';
      document.body.style.backgroundColor = '';
    };
  }, []);

  const handlePointerDown = (event: React.PointerEvent) => {
    if ((event.target as HTMLElement).closest('a, button')) return;
    setIsDragging(true);
    setDragStart(event.clientX);
    showUITemporarily();
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (isDragging) setDragOffset(event.clientX - dragStart);
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    if (Math.abs(dragOffset) > 70) pauseAndGo(dragOffset > 0 ? -1 : 1);
    setDragOffset(0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  if (!total || allImagesBroken) {
    return (
      <main className="fixed inset-0 flex min-h-[100dvh] items-center justify-center bg-[#050505] text-white/60">
        <div className="text-center">
          <p className="text-xl">暂无可展示的藏品图片</p>
          <Link href="/gallery" className="mt-5 inline-block border-b border-[#d4b896]/50 pb-1 text-[#d4b896]">返回画廊</Link>
        </div>
      </main>
    );
  }

  return (
    <main
      className="fixed inset-0 min-h-[100dvh] select-none overflow-hidden bg-[#050505] text-white"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onMouseMove={showUITemporarily}
      style={{ cursor: showUI ? 'default' : 'none' }}
    >
      <div
        className="absolute inset-0"
        style={{
          transform: `translateX(${dragOffset * 0.08}px) scale(${isDragging ? 1.01 : 1})`,
          transition: isDragging ? 'none' : 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {displayedArtwork ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={displayedArtwork.id}
            src={withBasePath(displayedArtwork.imageUrl)}
            alt={displayedArtwork.imageAlt}
            className={`absolute inset-0 size-full object-cover transition-opacity duration-1000 motion-reduce:transition-none ${imageVisible ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageVisible(true)}
            onError={() => skipBrokenTarget(visibleIndex)}
            referrerPolicy="no-referrer"
            draggable={false}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#050505]">
            <div className="size-10 animate-spin rounded-full border border-white/10 border-t-[#d4b896]/70 motion-reduce:animate-none" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/45" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-transparent to-transparent" />
      </div>

      {displayedIndex !== targetIndex && (
        <div className="absolute right-6 top-24 flex items-center gap-2 text-xs tracking-widest text-white/35">
          <span className="size-1.5 animate-pulse rounded-full bg-[#d4b896] motion-reduce:animate-none" />
          正在缓冲下一幅
        </div>
      )}

      {displayedArtwork && (
        <section
          className={`absolute bottom-0 left-0 max-w-[min(76rem,92vw)] px-7 pb-12 transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none sm:px-12 sm:pb-16 lg:px-20 lg:pb-20 ${detailsVisible ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}`}
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 3rem)' }}
        >
          <p className="mb-4 text-xs tracking-[0.32em] text-[#d4b896] sm:text-sm">{displayedArtwork.dynasty}代 · {displayedArtwork.objectType}</p>
          <h1 className="max-w-5xl text-[1.575rem] font-medium leading-[1.08] tracking-[0.08em] text-white drop-shadow-2xl sm:text-[2.625rem] lg:text-[3.15rem] xl:text-[4.2rem]">
            {displayedArtwork.titleChinese}
          </h1>
          <p className="mt-4 max-w-3xl font-serif-en text-base text-white/55 sm:text-xl lg:text-2xl">{displayedArtwork.titleEnglish}</p>
          <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-white/40 sm:text-base">
            <span>{displayedArtwork.material}</span>
            <span className="size-1 rounded-full bg-white/25" />
            <span>{displayedArtwork.sourceMuseum}</span>
          </div>
          <div className="mt-8 flex items-center gap-4">
            <div className="h-px w-48 max-w-[45vw] overflow-hidden bg-white/15">
              <div className="h-full bg-[#d4b896]/75 transition-[width] duration-500" style={{ width: `${((visibleIndex + 1) / total) * 100}%` }} />
            </div>
            <span className="font-serif-en text-sm tabular-nums text-white/35">{visibleIndex + 1} / {total}</span>
          </div>
        </section>
      )}

      <header
        className={`absolute left-0 right-0 top-0 flex items-center justify-between px-6 py-6 transition-[opacity,transform] duration-500 motion-reduce:transition-none sm:px-10 lg:px-16 ${showUI ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'}`}
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 1.5rem)' }}
      >
        <Link href="/gallery" className="inline-flex items-center gap-2 text-sm tracking-wide text-white/55 transition-colors hover:text-white">
          <CaretLeft size={20} weight="light" />
          <span className="hidden sm:inline">返回画廊</span>
        </Link>
        <Link href="/" className="text-lg tracking-[0.28em] text-white/45 transition-colors hover:text-white/75">器 · 茶</Link>
        <div className="flex items-center gap-5">
          <MusicToggle className="text-white/55 hover:text-white" />
          <button
            type="button"
            onClick={() => setIsAutoPlaying((playing) => !playing)}
            className="inline-flex items-center gap-2 text-white/55 transition-colors hover:text-white"
            aria-label={isAutoPlaying ? '暂停轮播' : '自动轮播'}
          >
            {isAutoPlaying ? <Pause size={20} weight="light" /> : <Play size={20} weight="light" />}
            <span className="hidden text-sm sm:inline">{isAutoPlaying ? '暂停轮播' : '自动轮播'}</span>
          </button>
        </div>
      </header>

      <button
        type="button"
        onClick={() => pauseAndGo(-1)}
        className={`absolute left-5 top-1/2 hidden size-14 -translate-y-1/2 items-center justify-center border border-white/10 bg-black/20 text-white/35 backdrop-blur-sm transition-[opacity,color,background-color] hover:bg-black/45 hover:text-white lg:flex ${showUI ? 'opacity-100' : 'opacity-0'}`}
        aria-label="上一件藏品"
      >
        <CaretLeft size={30} weight="light" />
      </button>
      <button
        type="button"
        onClick={() => pauseAndGo(1)}
        className={`absolute right-5 top-1/2 hidden size-14 -translate-y-1/2 items-center justify-center border border-white/10 bg-black/20 text-white/35 backdrop-blur-sm transition-[opacity,color,background-color] hover:bg-black/45 hover:text-white lg:flex ${showUI ? 'opacity-100' : 'opacity-0'}`}
        aria-label="下一件藏品"
      >
        <CaretRight size={30} weight="light" />
      </button>

      <p className={`absolute bottom-5 right-7 hidden text-xs tracking-wide text-white/20 transition-opacity lg:block ${showUI ? 'opacity-100' : 'opacity-0'}`}>
        ← → 切换　P 轮播　M 音乐　ESC 退出
      </p>
    </main>
  );
}
