'use client';

import { useLanguage } from './LanguageProvider';
import { SpeakerHigh, SpeakerSlash } from '@phosphor-icons/react';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';

export default function MusicToggle({ className = '' }: { className?: string }) {
  const { t } = useLanguage();
  const { isPlaying, toggleMusic } = useBackgroundMusic();

  return (
    <button
      type="button"
      onClick={toggleMusic}
      className={`inline-flex items-center gap-2 transition-colors ${className}`}
      aria-label={t(isPlaying ? 'stopMusic' : 'playMusic')}
      title={t(isPlaying ? 'stopMusic' : 'playMusic')}
    >
      {isPlaying ? <SpeakerSlash size={20} weight="light" /> : <SpeakerHigh size={20} weight="light" />}
      <span className="hidden sm:inline text-sm tracking-wide">
        {t(isPlaying ? 'stopMusic' : 'playMusic')}
      </span>
    </button>
  );
}
