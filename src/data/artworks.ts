import { Artwork } from '@/types/artwork';
import artworksData from './artworks.json';

export const artworks: Artwork[] = artworksData as Artwork[];

export const featuredArtwork = artworks[0];

export function getArtworksByDynasty(dynasty: string): Artwork[] {
  return artworks.filter(a => a.dynasty === dynasty);
}

export function getArtworksByMaterial(material: string): Artwork[] {
  return artworks.filter(a => a.material === material);
}

export function getArtworksByObjectType(objectType: string): Artwork[] {
  return artworks.filter(a => a.objectType === objectType);
}

export function getArtworkById(id: string): Artwork | undefined {
  return artworks.find(a => a.id === id);
}

export function getArtworksByMuseum(museum: string): Artwork[] {
  return artworks.filter(a => a.sourceMuseum === museum || a.sourceMuseumEnglish === museum);
}

export const dynasties = [...new Set(artworks.map(a => a.dynasty))];
export const materials = [...new Set(artworks.map(a => a.material))];
export const objectTypes = [...new Set(artworks.map(a => a.objectType))];
export const museums = [...new Set(artworks.map(a => a.sourceMuseum))];
