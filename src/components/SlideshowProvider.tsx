'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Artwork } from '@/types/artwork';
import Slideshow from './Slideshow';

interface SlideshowContextType {
  openSlideshow: (artworks: Artwork[], startIndex?: number) => void;
  closeSlideshow: () => void;
  isOpen: boolean;
}

const SlideshowContext = createContext<SlideshowContextType | null>(null);

export function useSlideshowContext() {
  const context = useContext(SlideshowContext);
  if (!context) {
    throw new Error('useSlideshowContext must be used within a SlideshowProvider');
  }
  return context;
}

interface SlideshowProviderProps {
  children: ReactNode;
}

export default function SlideshowProvider({ children }: SlideshowProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [slideshowArtworks, setSlideshowArtworks] = useState<Artwork[]>([]);
  const [startIndex, setStartIndex] = useState(0);

  const openSlideshow = useCallback((artworks: Artwork[], index: number = 0) => {
    setSlideshowArtworks(artworks);
    setStartIndex(index);
    setIsOpen(true);
  }, []);

  const closeSlideshow = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <SlideshowContext.Provider value={{ openSlideshow, closeSlideshow, isOpen }}>
      {children}
      {isOpen && slideshowArtworks.length > 0 && (
        <Slideshow
          artworks={slideshowArtworks}
          startIndex={startIndex}
          onClose={closeSlideshow}
        />
      )}
    </SlideshowContext.Provider>
  );
}
