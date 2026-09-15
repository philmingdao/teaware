'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { withBasePath } from '@/lib/paths';

const PLAYLIST = [
  '/audio/chinese-harmony-564699.mp3',
  '/audio/bamboo-grove-434735.mp3',
  '/audio/east-asian-melody-324382.mp3',
  '/audio/chinese-china-175674.mp3',
  '/audio/chinese-new-year-455963.mp3',
  '/audio/moonlit-whispers-353045.mp3',
  '/audio/china-apalonbeats-560419.mp3',
  '/audio/china-mondamusic-589131.mp3',
  '/audio/chinese-kulakovka-295886.mp3',
  '/audio/china-solarflex-569518.mp3',
] as const;

const PLAYBACK_VOLUME = 1;
const FADE_OUT_DURATION = 1800;

interface BackgroundMusicContextValue {
  isPlaying: boolean;
  startMusic: () => void;
  stopMusic: () => void;
  toggleMusic: () => void;
}

const BackgroundMusicContext = createContext<BackgroundMusicContextValue | null>(null);

function createShuffledQueue(previousIndex: number) {
  const queue = Array.from({ length: PLAYLIST.length }, (_, index) => index);

  for (let index = queue.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [queue[index], queue[swapIndex]] = [queue[swapIndex], queue[index]];
  }

  if (queue.length > 1 && queue[0] === previousIndex) {
    const swapIndex = 1 + Math.floor(Math.random() * (queue.length - 1));
    [queue[0], queue[swapIndex]] = [queue[swapIndex], queue[0]];
  }

  return queue;
}

export function BackgroundMusicProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrackRef = useRef(-1);
  const shuffleQueueRef = useRef<number[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const shouldPlayRef = useRef(false);
  const playRandomTrackRef = useRef<() => void>(() => undefined);
  const attemptPlaybackRef = useRef<(audio: HTMLAudioElement) => void>(() => undefined);
  const interactionRetryRef = useRef<(() => void) | null>(null);

  const clearFade = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const clearInteractionRetry = useCallback(() => {
    const retry = interactionRetryRef.current;
    if (!retry) return;
    document.removeEventListener('pointerdown', retry, true);
    document.removeEventListener('keydown', retry, true);
    document.removeEventListener('touchstart', retry, true);
    interactionRetryRef.current = null;
  }, []);

  const retryOnNextInteraction = useCallback((callback: () => void) => {
    clearInteractionRetry();
    const retry = () => {
      clearInteractionRetry();
      callback();
    };
    interactionRetryRef.current = retry;
    document.addEventListener('pointerdown', retry, true);
    document.addEventListener('keydown', retry, true);
    document.addEventListener('touchstart', retry, true);
  }, [clearInteractionRetry]);

  const releaseAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.onended = null;
    audio.onerror = null;
    audio.onplaying = null;
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    audioRef.current = null;
  }, []);

  const fadeTo = useCallback((audio: HTMLAudioElement, target: number, duration: number, onDone?: () => void) => {
    clearFade();
    const initialVolume = audio.volume;
    const startedAt = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      audio.volume = initialVolume + (target - initialVolume) * progress;
      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        animationFrameRef.current = null;
        onDone?.();
      }
    };

    animationFrameRef.current = requestAnimationFrame(step);
  }, [clearFade]);

  const attemptPlayback = useCallback((audio: HTMLAudioElement) => {
    if (!shouldPlayRef.current || audioRef.current !== audio) return;

    audio.volume = PLAYBACK_VOLUME;
    void audio.play().then(() => {
      if (!shouldPlayRef.current || audioRef.current !== audio) {
        audio.pause();
        return;
      }
      clearInteractionRetry();
      setIsPlaying(true);
    }).catch(() => {
      if (!shouldPlayRef.current || audioRef.current !== audio) return;
      setIsPlaying(false);
      retryOnNextInteraction(() => attemptPlaybackRef.current(audio));
    });
  }, [clearInteractionRetry, retryOnNextInteraction]);

  useEffect(() => {
    attemptPlaybackRef.current = attemptPlayback;
  }, [attemptPlayback]);

  const playRandomTrack = useCallback(() => {
    if (!shouldPlayRef.current) return;

    clearFade();
    clearInteractionRetry();
    releaseAudio();
    if (shuffleQueueRef.current.length === 0) {
      shuffleQueueRef.current = createShuffledQueue(currentTrackRef.current);
    }
    const nextIndex = shuffleQueueRef.current.shift();
    if (nextIndex === undefined) return;
    currentTrackRef.current = nextIndex;

    const audio = new Audio(withBasePath(PLAYLIST[nextIndex]));
    audio.preload = 'auto';
    audio.volume = PLAYBACK_VOLUME;
    audioRef.current = audio;
    audio.onended = () => playRandomTrackRef.current();
    audio.onerror = () => playRandomTrackRef.current();
    audio.onplaying = () => setIsPlaying(true);
    attemptPlayback(audio);
  }, [attemptPlayback, clearFade, clearInteractionRetry, releaseAudio]);

  useEffect(() => {
    playRandomTrackRef.current = playRandomTrack;
  }, [playRandomTrack]);

  const startMusic = useCallback(() => {
    shouldPlayRef.current = true;
    const audio = audioRef.current;
    if (audio) {
      clearFade();
      attemptPlayback(audio);
      return;
    }
    playRandomTrackRef.current();
  }, [attemptPlayback, clearFade]);

  const stopMusic = useCallback(() => {
    shouldPlayRef.current = false;
    setIsPlaying(false);
    clearInteractionRetry();
    const audio = audioRef.current;
    if (!audio) return;
    fadeTo(audio, 0, FADE_OUT_DURATION, releaseAudio);
  }, [clearInteractionRetry, fadeTo, releaseAudio]);

  const toggleMusic = useCallback(() => {
    if (isPlaying) stopMusic();
    else startMusic();
  }, [isPlaying, startMusic, stopMusic]);

  useEffect(() => () => {
    shouldPlayRef.current = false;
    clearFade();
    clearInteractionRetry();
    releaseAudio();
  }, [clearFade, clearInteractionRetry, releaseAudio]);

  const value = useMemo(() => ({
    isPlaying,
    startMusic,
    stopMusic,
    toggleMusic,
  }), [isPlaying, startMusic, stopMusic, toggleMusic]);

  return (
    <BackgroundMusicContext.Provider value={value}>
      {children}
    </BackgroundMusicContext.Provider>
  );
}

export function useBackgroundMusic() {
  const context = useContext(BackgroundMusicContext);
  if (!context) {
    throw new Error('useBackgroundMusic must be used within a BackgroundMusicProvider');
  }
  return context;
}
