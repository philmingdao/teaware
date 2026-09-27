/**
 * Minimal navigation data for artwork detail pages.
 * 
 * This module provides only the data needed for prev/next navigation,
 * significantly reducing the RSC payload size compared to embedding
 * the full artworks array in each page.
 */

import artworksData from './artworks.json';

export interface NavItem {
  id: string;
  titleChinese: string;
}

export interface ArtworkNavigation {
  prev: NavItem | null;
  next: NavItem | null;
  currentIndex: number;
  totalCount: number;
}

// Pre-compute navigation map at module load time
const artworkIds: string[] = artworksData.map(a => a.id);
const artworkTitles: Map<string, string> = new Map(
  artworksData.map(a => [a.id, a.titleChinese])
);

/**
 * Get navigation data for an artwork by ID.
 * Returns prev/next links with minimal data (id + title only).
 */
export function getArtworkNavigation(id: string): ArtworkNavigation | null {
  const currentIndex = artworkIds.indexOf(id);
  
  if (currentIndex === -1) {
    return null;
  }
  
  const prevId = currentIndex > 0 ? artworkIds[currentIndex - 1] : null;
  const nextId = currentIndex < artworkIds.length - 1 ? artworkIds[currentIndex + 1] : null;
  
  return {
    prev: prevId ? { id: prevId, titleChinese: artworkTitles.get(prevId)! } : null,
    next: nextId ? { id: nextId, titleChinese: artworkTitles.get(nextId)! } : null,
    currentIndex,
    totalCount: artworkIds.length,
  };
}

/**
 * Get the list of all artwork IDs for static generation.
 */
export function getAllArtworkIds(): string[] {
  return artworkIds;
}
