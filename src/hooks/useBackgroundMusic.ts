'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const PLAYLIST = [
  '/audio/blossom-valley-in-paradise.mp3',
  '/audio/guzheng-solo.mp3',
  '/audio/a-ride-through-chinese-valley.mp3',
];

const STORAGE_KEY = 'teaware-bgm-muted';
const DEFAULT_VOLUME = 0.15;
const FADE_DURATION = 1800;

interface UseBackgroundMusicReturn {
  isPlaying: boolean;
  isMuted: boolean;
  toggleMute: () => void;
  startMusic: () => void;
  stopMusic: () => void;
}

export function useBackgroundMusic(): UseBackgroundMusicReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrackRef = useRef(0);
  const fadeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isStoppingRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setIsMuted(stored === 'true');
      }
    }
  }, []);

  const clearFadeInterval = useCallback(() => {
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
      fadeIntervalRef.current = null;
    }
  }, []);

  const getBasePath = useCallback(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      return '/teaware';
    }
    return '';
  }, []);

  const createAudio = useCallback((trackIndex: number) => {
    const basePath = getBasePath();
    const audio = new Audio(basePath + PLAYLIST[trackIndex]);
    audio.volume = isMuted ? 0 : DEFAULT_VOLUME;
    audio.preload = 'auto';
    return audio;
  }, [getBasePath, isMuted]);

  const playNextTrack = useCallback(() => {
    if (isStoppingRef.current) return;
    
    currentTrackRef.current = (currentTrackRef.current + 1) % PLAYLIST.length;
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    
    const audio = createAudio(currentTrackRef.current);
    audioRef.current = audio;
    
    audio.onended = playNextTrack;
    audio.onerror = () => {
      console.warn('Audio load error, trying next track');
      playNextTrack();
    };
    
    audio.play().catch(() => {
      console.warn('Autoplay blocked for next track');
    });
  }, [createAudio]);

  const startMusic = useCallback(() => {
    if (isPlaying || isStoppingRef.current) return;
    
    clearFadeInterval();
    isStoppingRef.current = false;
    
    currentTrackRef.current = Math.floor(Math.random() * PLAYLIST.length);
    
    const audio = createAudio(currentTrackRef.current);
    audioRef.current = audio;
    
    audio.onended = playNextTrack;
    audio.onerror = () => {
      console.warn('Audio load error, trying next track');
      playNextTrack();
    };
    
    audio.play()
      .then(() => {
        setIsPlaying(true);
      })
      .catch((err) => {
        console.warn('Autoplay blocked:', err);
        setIsPlaying(false);
      });
  }, [isPlaying, createAudio, playNextTrack, clearFadeInterval]);

  const stopMusic = useCallback(() => {
    if (!audioRef.current || isStoppingRef.current) return;
    
    isStoppingRef.current = true;
    clearFadeInterval();
    
    const audio = audioRef.current;
    const startVolume = audio.volume;
    const startTime = Date.now();
    
    fadeIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / FADE_DURATION, 1);
      
      audio.volume = startVolume * (1 - progress);
      
      if (progress >= 1) {
        clearFadeInterval();
        audio.pause();
        audio.src = '';
        audioRef.current = null;
        setIsPlaying(false);
        isStoppingRef.current = false;
      }
    }, 50);
  }, [clearFadeInterval]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const newMuted = !prev;
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, String(newMuted));
      }
      
      if (audioRef.current) {
        audioRef.current.volume = newMuted ? 0 : DEFAULT_VOLUME;
      }
      
      return newMuted;
    });
  }, []);

  useEffect(() => {
    return () => {
      clearFadeInterval();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, [clearFadeInterval]);

  return {
    isPlaying,
    isMuted,
    toggleMute,
    startMusic,
    stopMusic,
  };
}
