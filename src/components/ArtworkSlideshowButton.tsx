'use client';

import { useSlideshowContext } from './SlideshowProvider';

interface ArtworkSlideshowButtonProps {
  currentArtworkId: string;
}

export default function ArtworkSlideshowButton({ 
  currentArtworkId 
}: ArtworkSlideshowButtonProps) {
  const { openSlideshow } = useSlideshowContext();

  return (
    <button
      onClick={() => openSlideshow(currentArtworkId)}
      className="btn-elegant inline-flex items-center gap-2"
    >
      <svg 
        className="w-4 h-4" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={1.5} 
          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" 
        />
      </svg>
      开始幻灯
      <span className="font-serif-en text-xs opacity-60">Slideshow</span>
    </button>
  );
}
