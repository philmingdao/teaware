'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Artwork } from '@/types/artwork';
import Slideshow from './Slideshow';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';
import { withBasePath } from '@/lib/paths';

interface SlideshowContextType {
  openSlideshow: (startArtworkId?: string) => void;
  closeSlideshow: () => void;
  isOpen: boolean;
}

const SlideshowContext = createContext<SlideshowContextType | null>(null);

let cachedArtworks: Artwork[] | null = null;

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
  const [isLoading, setIsLoading] = useState(false);
  
  const { startMusic, stopMusic } = useBackgroundMusic();

  const openSlideshow = useCallback(async (startArtworkId?: string) => {
    setIsLoading(true);
    
    try {
      let artworks = cachedArtworks;
      if (!artworks) {
        const response = await fetch(withBasePath('/artworks.json'));
        artworks = await response.json();
        cachedArtworks = artworks;
      }
      
      if (artworks && artworks.length > 0) {
        setSlideshowArtworks(artworks);
        const index = startArtworkId 
          ? artworks.findIndex((a: Artwork) => a.id === startArtworkId)
          : 0;
        setStartIndex(index >= 0 ? index : 0);
        setIsOpen(true);
        startMusic();
      }
    } catch (error) {
      console.error('Failed to load artworks for slideshow:', error);
    } finally {
      setIsLoading(false);
    }
  }, [startMusic]);

  const closeSlideshow = useCallback(() => {
    stopMusic();
    setIsOpen(false);
  }, [stopMusic]);

  return (
    <SlideshowContext.Provider value={{ openSlideshow, closeSlideshow, isOpen }}>
      {children}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="text-white text-lg">加载中...</div>
        </div>
      )}
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
