'use client';

import { SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';

export default function MusicToggle({ className = '' }: { className?: string }) {
  const { isPlaying, toggleMusic } = useBackgroundMusic();

  return (
    <button
      type="button"
      onClick={toggleMusic}
      className={`inline-flex items-center gap-2 transition-colors ${className}`}
      aria-label={isPlaying ? '停止音乐' : '播放音乐'}
      title={isPlaying ? '停止音乐' : '播放音乐'}
    >
      {isPlaying ? <SpeakerSlash size={20} weight="light" /> : <SpeakerHigh size={20} weight="light" />}
      <span className="hidden sm:inline text-sm tracking-wide">
        {isPlaying ? '停止音乐' : '播放音乐'}
      </span>
    </button>
  );
}
