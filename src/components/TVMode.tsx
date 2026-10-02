'use client';

import { useLanguage } from './LanguageProvider';
import { localizedHref, artworkTitle, artworkType, periodName, term, museumName } from '@/lib/i18n';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import Link from '@/components/LocaleLink';
import { useRouter, useSearchParams } from 'next/navigation';
import { CaretLeft, CaretRight, Pause, Play } from '@phosphor-icons/react';
import { artworks } from '@/data/artworks';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import { withBasePath } from '@/lib/paths';
import MusicToggle from './MusicToggle';
import LanguageSwitcher from './LanguageSwitcher';
import { MuseumStage, MuseumArtifact } from './MuseumExhibit';
import museumStyles from './MuseumExhibit.module.css';
import type { Artwork } from '@/types/artwork';

type Direction = 1 | -1;
const AUTOPLAY_INTERVAL_MS = 8000;
const CROSSFADE_DURATION_MS = 1200;

function createShuffleOrder(total: number, firstIndex: number | null) {
  const order = Array.from({ length: total }, (_, index) => index)
    .filter((index) => index !== firstIndex);

  for (let index = order.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }

  return firstIndex === null ? order : [firstIndex, ...order];
}

export default function TVMode({ collection, onClose }: { collection?: Artwork[]; onClose?: () => void } = {}) {
  const { locale, t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { startMusic, stopMusic, toggleMusic } = useBackgroundMusic();

  const startId = searchParams.get('start');
  const filterMuseum = searchParams.get('museum');
  const filterDynasty = searchParams.get('dynasty');
  const filterMaterial = searchParams.get('material');
  const filterObjectType = searchParams.get('objectType');
  const close = useCallback(() => {
    if (onClose) onClose();
    else router.push(localizedHref('/gallery', locale));
  }, [onClose, router, locale]);

  const filteredArtworks = useMemo(() => collection ?? artworks.filter((artwork) => {
    if (filterMuseum && artwork.sourceMuseum !== filterMuseum) return false;
    if (filterDynasty && artwork.dynasty !== filterDynasty) return false;
    if (filterMaterial && artwork.material !== filterMaterial) return false;
    if (filterObjectType && artwork.objectType !== filterObjectType) return false;
    return true;
  }), [collection, filterDynasty, filterMuseum, filterMaterial, filterObjectType]);

  const requestedStartIndex = useMemo(() => {
    if (!startId) return null;
    const index = filteredArtworks.findIndex((artwork) => artwork.id === startId);
    return index >= 0 ? index : null;
  }, [filteredArtworks, startId]);

  const [playOrder, setPlayOrder] = useState<number[]>([]);
  const [targetPosition, setTargetPosition] = useState(0);
  const [displayedPosition, setDisplayedPosition] = useState<number | null>(null);
  const [displayedIndex, setDisplayedIndex] = useState<number | null>(null);
  const [outgoingIndex, setOutgoingIndex] = useState<number | null>(null);
  const [imageVisible, setImageVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [showUI, setShowUI] = useState(true);
  const [allImagesBroken, setAllImagesBroken] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);

  const brokenArtworkIdsRef = useRef(new Set<string>());
  const uiTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const detailsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionFrameRef = useRef<number | null>(null);
  const displayedIndexRef = useRef<number | null>(null);
  const total = filteredArtworks.length;
  const targetIndex = playOrder[targetPosition] ?? null;
  const visiblePosition = displayedPosition ?? 0;
  const displayedArtwork = displayedIndex === null ? null : filteredArtworks[displayedIndex];
  const outgoingArtwork = outgoingIndex === null ? null : filteredArtworks[outgoingIndex];

  useEffect(() => {
    if (!total) return;
    const nextOrder = createShuffleOrder(total, requestedStartIndex);
    // Browser-only initialization keeps random order out of the static HTML.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlayOrder(nextOrder);
    setTargetPosition(0);
  }, [requestedStartIndex, total]);

  const findAvailablePosition = useCallback((fromPosition: number, direction: Direction) => {
    for (let step = 1; step < total; step += 1) {
      const candidatePosition = (fromPosition + direction * step + total) % total;
      const candidateIndex = playOrder[candidatePosition];
      if (candidateIndex === undefined) continue;
      if (!brokenArtworkIdsRef.current.has(filteredArtworks[candidateIndex].id)) return candidatePosition;
    }
    return null;
  }, [filteredArtworks, playOrder, total]);

  const queuePosition = useCallback((nextPosition: number) => {
    setDetailsVisible(false);
    setTargetPosition(nextPosition);
  }, []);

  const goNext = useCallback(() => {
    const nextPosition = findAvailablePosition(targetPosition, 1);
    if (nextPosition !== null) queuePosition(nextPosition);
  }, [findAvailablePosition, queuePosition, targetPosition]);

  const goPrev = useCallback(() => {
    const previousPosition = findAvailablePosition(targetPosition, -1);
    if (previousPosition !== null) queuePosition(previousPosition);
  }, [findAvailablePosition, queuePosition, targetPosition]);

  const pauseAndGo = useCallback((direction: Direction) => {
    setIsAutoPlaying(false);
    if (direction === 1) goNext();
    else goPrev();
  }, [goNext, goPrev]);

  const skipBrokenTarget = useCallback((brokenPosition: number) => {
    const brokenIndex = playOrder[brokenPosition];
    const brokenArtwork = filteredArtworks[brokenIndex];
    if (!brokenArtwork) return;
    brokenArtworkIdsRef.current.add(brokenArtwork.id);
    const nextPosition = findAvailablePosition(brokenPosition, 1);
    if (nextPosition === null) {
      setAllImagesBroken(true);
      setIsAutoPlaying(false);
      return;
    }
    queuePosition(nextPosition);
  }, [filteredArtworks, findAvailablePosition, playOrder, queuePosition]);

  useEffect(() => {
    startMusic();
    return () => stopMusic();
  }, [startMusic, stopMusic]);

  const showBufferedArtwork = useCallback((nextPosition: number, nextIndex: number) => {
    if (transitionFrameRef.current !== null) cancelAnimationFrame(transitionFrameRef.current);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);

    const previousIndex = displayedIndexRef.current;
    if (previousIndex === nextIndex) {
      setDisplayedPosition(nextPosition);
      setImageVisible(true);
      return;
    }

    setOutgoingIndex(previousIndex);
    setImageVisible(false);
    setDisplayedPosition(nextPosition);
    setDisplayedIndex(nextIndex);
    displayedIndexRef.current = nextIndex;

    // Two frames guarantee that both image layers first render at their
    // starting opacity before the browser begins the crossfade.
    transitionFrameRef.current = requestAnimationFrame(() => {
      transitionFrameRef.current = requestAnimationFrame(() => {
        setImageVisible(true);
        transitionFrameRef.current = null;
        transitionTimeoutRef.current = setTimeout(() => {
          setOutgoingIndex(null);
          transitionTimeoutRef.current = null;
        }, CROSSFADE_DURATION_MS);
      });
    });
  }, []);

  useEffect(() => () => {
    if (transitionFrameRef.current !== null) cancelAnimationFrame(transitionFrameRef.current);
    if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (!total || allImagesBroken || targetIndex === null) return;
    const targetArtwork = filteredArtworks[targetIndex];
    if (!targetArtwork) return;

    let cancelled = false;
    const bufferedImage = new window.Image();
    bufferedImage.referrerPolicy = 'no-referrer';
    bufferedImage.onload = () => {
      void bufferedImage.decode().catch(() => undefined).then(() => {
        if (!cancelled) {
          showBufferedArtwork(targetPosition, targetIndex);
        }
      });
    };
    bufferedImage.onerror = () => {
      if (!cancelled) skipBrokenTarget(targetPosition);
    };
    bufferedImage.src = withBasePath(targetArtwork.imageUrl);

    return () => {
      cancelled = true;
      bufferedImage.onload = null;
      bufferedImage.onerror = null;
    };
  }, [allImagesBroken, filteredArtworks, showBufferedArtwork, skipBrokenTarget, targetIndex, targetPosition, total]);

  useEffect(() => {
    if (!imageVisible) return;
    detailsTimeoutRef.current = setTimeout(() => setDetailsVisible(true), 420);
    return () => {
      if (detailsTimeoutRef.current) clearTimeout(detailsTimeoutRef.current);
    };
  }, [imageVisible]);

  useEffect(() => {
    if (displayedPosition === null || total < 2) return;
    const nextPosition = findAvailablePosition(displayedPosition, 1);
    if (nextPosition === null) return;
    const nextIndex = playOrder[nextPosition];
    if (nextIndex === undefined) return;
    const image = new window.Image();
    image.referrerPolicy = 'no-referrer';
    image.src = withBasePath(filteredArtworks[nextIndex].imageUrl);
  }, [displayedPosition, filteredArtworks, findAvailablePosition, playOrder, total]);

  useEffect(() => {
    if (isAutoPlaying) {
      autoplayRef.current = setInterval(goNext, AUTOPLAY_INTERVAL_MS);
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
      if (event.key !== 'Escape' && (event.target as HTMLElement).closest('select, input, textarea')) return;
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
          close();
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
  }, [pauseAndGo, close, showUITemporarily, toggleMusic]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.style.backgroundColor = '#050505';
    return () => {
      document.body.style.overflow = '';
      document.body.style.backgroundColor = '';
    };
  }, []);

  const handlePointerDown = (event: React.PointerEvent) => {
    if ((event.target as HTMLElement).closest('a, button, select, input, label')) return;
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
      <main className="fixed inset-0 z-[100] flex min-h-[100dvh] items-center justify-center bg-[#050505] text-white/60">
        <div className="text-center">
          <p className="text-xl">{t('emptyImages')}</p>
          <button type="button" onClick={close} className="mt-5 inline-block border-b border-[#d4b896]/50 pb-1 text-[#d4b896]">{t('backGallery')}</button>
        </div>
      </main>
    );
  }

  return (
    <main
      className="fixed inset-0 z-[100] min-h-[100dvh] select-none overflow-hidden bg-[#050505] text-white"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onMouseMove={showUITemporarily}
      style={{ cursor: showUI ? 'default' : 'none' }}
    >
      <div className="absolute inset-0" style={{ '--drag-offset': `${dragOffset * 0.08}px` } as CSSProperties}>
        <MuseumStage variant="tv">
        {displayedArtwork ? (
          <>
            {outgoingArtwork && (
              <MuseumArtifact
                key={`outgoing-${outgoingArtwork.id}`}
                artwork={outgoingArtwork}
                alt=""
                layer="outgoing"
                visible={!imageVisible}
                duration={CROSSFADE_DURATION_MS}
              />
            )}
            <MuseumArtifact
              key={displayedArtwork.id}
              artwork={displayedArtwork}
              alt={artworkTitle(displayedArtwork, locale)}
              layer="incoming"
              visible={imageVisible}
              duration={CROSSFADE_DURATION_MS}
              onError={() => skipBrokenTarget(visiblePosition)}
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="size-10 animate-spin rounded-full border border-white/10 border-t-[#d4b896]/70 motion-reduce:animate-none" />
          </div>
        )}

        </MuseumStage>
      </div>

      {displayedPosition !== targetPosition && (
        <div className="absolute right-6 top-24 flex items-center gap-2 text-xs tracking-widest text-white/35">
          <span className="size-1.5 animate-pulse rounded-full bg-[#d4b896] motion-reduce:animate-none" />
          {t('buffering')}
        </div>
      )}

      {displayedArtwork && (
        <section
          className={`${museumStyles.caption} absolute bottom-0 inset-x-0 grid gap-4 px-7 pb-8 transition-opacity duration-700 ease-out motion-reduce:transition-none sm:px-12 sm:pb-10 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,25%)] lg:items-end lg:gap-12 lg:px-20 ${detailsVisible ? 'opacity-100' : 'opacity-0'}`}
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 2rem)' }}
        >
          <div className="min-w-0">
          <p className="mb-2 text-[11px] tracking-[0.25em] text-[#d4b896] sm:text-xs">{periodName(displayedArtwork.dynasty, locale, displayedArtwork.dynastyEnglish)} · {artworkType(displayedArtwork, locale)}</p>
          <h1 className="line-clamp-2 text-2xl font-medium leading-tight tracking-[0.06em] text-white sm:text-3xl lg:text-4xl">
            {artworkTitle(displayedArtwork, locale)}
          </h1>
          <p className="mt-2 line-clamp-1 font-serif-en text-sm text-white/60 sm:text-base">{displayedArtwork.titleEnglish}</p>
          </div>
          <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/65 sm:text-sm">
            <span>{term(displayedArtwork.material, locale, displayedArtwork.materialEnglish)}</span>
            <span className="size-1 rounded-full bg-white/25" />
            <span>{museumName(displayedArtwork, locale)}</span>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <div className="h-px w-48 max-w-[45vw] overflow-hidden bg-white/15">
              <div className="h-full bg-[#d4b896]/75 transition-[width] duration-500" style={{ width: `${((visiblePosition + 1) / total) * 100}%` }} />
            </div>
            <span className="font-serif-en text-sm tabular-nums text-white/35">{visiblePosition + 1} / {total}</span>
          </div>
          </div>
        </section>
      )}

      <header
        className={`absolute left-0 right-0 top-0 flex items-center justify-between px-6 py-6 transition-opacity duration-500 motion-reduce:transition-none sm:px-10 lg:px-16 ${showUI ? 'opacity-100' : 'opacity-0'}`}
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 1.5rem)' }}
      >
        <button type="button" onClick={close} aria-label={t('backGallery')} className="inline-flex items-center gap-2 text-sm tracking-wide text-white/55 transition-colors hover:text-white">
          <CaretLeft size={20} weight="light" />
          <span className="hidden sm:inline">{t('backGallery')}</span>
        </button>
        <Link href="/" className="text-lg tracking-[0.28em] text-white/45 transition-colors hover:text-white/75">{t('brand')}</Link>
        <div className="flex items-center gap-5">
          <LanguageSwitcher inverted />
          <MusicToggle className="text-white/55 hover:text-white" />
          <button
            type="button"
            onClick={() => setIsAutoPlaying((playing) => !playing)}
            className="inline-flex items-center gap-2 text-white/55 transition-colors hover:text-white"
            aria-label={t(isAutoPlaying ? 'pauseTV' : 'playTV')}
          >
            {isAutoPlaying ? <Pause size={20} weight="light" /> : <Play size={20} weight="light" />}
            <span className="hidden text-sm sm:inline">{t(isAutoPlaying ? 'pauseTV' : 'playTV')}</span>
          </button>
        </div>
      </header>

      <button
        type="button"
        onClick={() => pauseAndGo(-1)}
        className={`absolute left-5 top-1/2 hidden size-14 -translate-y-1/2 items-center justify-center border border-white/10 bg-black/20 text-white/35 backdrop-blur-sm transition-[opacity,color,background-color] hover:bg-black/45 hover:text-white lg:flex ${showUI ? 'opacity-100' : 'opacity-0'}`}
        aria-label={t('prev')}
      >
        <CaretLeft size={30} weight="light" />
      </button>
      <button
        type="button"
        onClick={() => pauseAndGo(1)}
        className={`absolute right-5 top-1/2 hidden size-14 -translate-y-1/2 items-center justify-center border border-white/10 bg-black/20 text-white/35 backdrop-blur-sm transition-[opacity,color,background-color] hover:bg-black/45 hover:text-white lg:flex ${showUI ? 'opacity-100' : 'opacity-0'}`}
        aria-label={t('next')}
      >
        <CaretRight size={30} weight="light" />
      </button>

      <p className={`absolute bottom-5 right-7 hidden text-xs tracking-wide text-white/20 transition-opacity lg:block ${showUI ? 'opacity-100' : 'opacity-0'}`}>
        {t('shortcuts')}
      </p>
    </main>
  );
}
