import manifest from '@/data/collection-cutouts.json';
import type { Artwork } from '@/types/artwork';

export interface CutoutAsset {
  url: string;
  sourceSha256: string;
  qaStatus: 'reviewed';
  shadowBaselinePercent: number;
  shadowContactCenterPercent: number;
  shadowContactWidthPercent: number;
  shadowCastCenterPercent: number;
  shadowCastWidthPercent: number;
  shadowEnabled: boolean;
}

const assets = manifest.assets as Record<string, CutoutAsset>;

export function getCollectionCutout(id: string): CutoutAsset | undefined {
  return assets[id];
}

export function withCollectionImage(artwork: Artwork): Artwork {
  const cutout = getCollectionCutout(artwork.id);
  return cutout ? { ...artwork, imageUrl: cutout.url, imagePresentation: cutout } : artwork;
}
