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

const DEFAULT_VOLUME = 0.15;
const FADE_IN_DURATION = 900;
const FADE_OUT_DURATION = 1800;

interface BackgroundMusicContextValue {
  isPlaying: boolean;
  startMusic: () => void;
  stopMusic: () => void;
  toggleMusic: () => void;
}

const BackgroundMusicContext = createContext<BackgroundMusicContextValue | null>(null);

function pickRandomTrack(previousIndex: number) {
  let nextIndex = previousIndex;
  while (nextIndex === previousIndex) {
    nextIndex = Math.floor(Math.random() * PLAYLIST.length);
  }
  return nextIndex;
}

export function BackgroundMusicProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrackRef = useRef(-1);
  const animationFrameRef = useRef<number | null>(null);
  const shouldPlayRef = useRef(false);
  const playRandomTrackRef = useRef<() => void>(() => undefined);

  const clearFade = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const releaseAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.onended = null;
    audio.onerror = null;
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

  const playRandomTrack = useCallback(() => {
    if (!shouldPlayRef.current) return;

    clearFade();
    releaseAudio();
    const nextIndex = pickRandomTrack(currentTrackRef.current);
    currentTrackRef.current = nextIndex;

    const audio = new Audio(withBasePath(PLAYLIST[nextIndex]));
    audio.preload = 'auto';
    audio.volume = 0;
    audioRef.current = audio;
    audio.onended = () => playRandomTrackRef.current();
    audio.onerror = () => playRandomTrackRef.current();

    void audio.play().then(() => {
      if (!shouldPlayRef.current) return;
      setIsPlaying(true);
      fadeTo(audio, DEFAULT_VOLUME, FADE_IN_DURATION);
    }).catch(() => {
      setIsPlaying(false);
      releaseAudio();
    });
  }, [clearFade, fadeTo, releaseAudio]);

  useEffect(() => {
    playRandomTrackRef.current = playRandomTrack;
  }, [playRandomTrack]);

  const startMusic = useCallback(() => {
    if (shouldPlayRef.current && audioRef.current) return;
    shouldPlayRef.current = true;
    playRandomTrackRef.current();
  }, []);

  const stopMusic = useCallback(() => {
    shouldPlayRef.current = false;
    setIsPlaying(false);
    const audio = audioRef.current;
    if (!audio) return;
    fadeTo(audio, 0, FADE_OUT_DURATION, releaseAudio);
  }, [fadeTo, releaseAudio]);

  const toggleMusic = useCallback(() => {
    if (shouldPlayRef.current) stopMusic();
    else startMusic();
  }, [startMusic, stopMusic]);

  useEffect(() => () => {
    shouldPlayRef.current = false;
    clearFade();
    releaseAudio();
  }, [clearFade, releaseAudio]);

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
