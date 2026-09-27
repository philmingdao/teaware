/**
 * Artwork lookup by ID - optimized for single-item retrieval.
 * 
 * This module creates a Map for O(1) lookup without needing to
 * iterate through the full array. The JSON data is still loaded,
 * but this module is specifically for pages that only need one artwork.
 */

import { Artwork } from '@/types/artwork';
import artworksData from './artworks.json';

const artworkMap: Map<string, Artwork> = new Map(
  (artworksData as Artwork[]).map(a => [a.id, a])
);

/**
 * Get a single artwork by ID.
 */
export function getArtworkById(id: string): Artwork | undefined {
  return artworkMap.get(id);
}

/**
 * Check if an artwork exists.
 */
export function artworkExists(id: string): boolean {
  return artworkMap.has(id);
}
