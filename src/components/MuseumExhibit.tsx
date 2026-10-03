'use client';

import type { CSSProperties, ReactNode } from 'react';
import Image from 'next/image';
import type { Artwork } from '@/types/artwork';
import { getCollectionCutout } from '@/lib/collection-images';
import { withBasePath } from '@/lib/paths';
import exhibitLayout from '@/data/exhibit-layout.json';
import ResilientImage from './ResilientImage';
import styles from './MuseumExhibit.module.css';

const boundsByUrl = exhibitLayout as Record<string, number[]>;

export function MuseumStage({ children, variant }: { children: ReactNode; variant: 'slideshow' | 'tv' }) {
  return <div className={`${styles.stage} ${variant === 'tv' ? styles.tv : ''}`} data-museum-stage={variant}>
    <div className={styles.environment} aria-hidden>
      <Image src={withBasePath('/exhibition/black-velvet.webp')} alt="" fill preload sizes="100vw"
        unoptimized className={styles.backdrop} data-museum-backdrop />
    </div>
    {children}
    <div className={styles.shade} aria-hidden />
  </div>;
}

interface ArtifactProps {
  artwork: Artwork;
  alt: string;
  layer?: 'incoming' | 'outgoing';
  visible?: boolean;
  duration?: number;
  onError?: () => void;
}

export function MuseumArtifact({ artwork, alt, layer, visible = true, duration = 1200, onError }: ArtifactProps) {
  const cutout = getCollectionCutout(artwork.id);
  const src = cutout?.url ?? artwork.imageUrl;
  const bounds = boundsByUrl[src] ?? [0.1, 0.1, 0.9, 0.9];
  const baseline = cutout?.shadowBaselinePercent ?? bounds[3] * 100;
  const style = {
    '--object-width': bounds[2] - bounds[0],
    '--object-height': bounds[3] - bounds[1],
    '--object-anchor-x': `${-(bounds[0] + bounds[2]) * 50}%`,
    '--object-anchor-y': `${-bounds[3] * 100}%`,
    '--shadow-baseline': `${baseline}%`,
    '--shadow-contact-center': `${cutout?.shadowContactCenterPercent ?? 50}%`,
    '--shadow-contact-width': `${cutout?.shadowContactWidthPercent ?? 15}%`,
    '--shadow-cast-center': `${cutout?.shadowCastCenterPercent ?? 50}%`,
    '--shadow-cast-width': `${cutout?.shadowCastWidthPercent ?? 45}%`,
    opacity: visible ? 1 : 0,
    transitionDuration: `${duration}ms`,
  } as CSSProperties;

  return <div className={styles.objectFrame} style={style} data-exhibit-artifact={artwork.id}
    data-exhibit-layer={layer} aria-hidden={layer === 'outgoing' ? true : undefined}>
    {cutout?.shadowEnabled && <><span className={styles.cast} aria-hidden /><span className={styles.contact} aria-hidden /></>}
    {layer ? (
      // The TV player already decodes and buffers these exact images before fading.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={withBasePath(src)} alt={alt} data-tv-image={layer} className={styles.image}
        onError={onError} referrerPolicy="no-referrer" draggable={false} />
    ) : <ResilientImage src={src} alt={alt} fill objectFit="contain" sizes="100vw" priority className={styles.image} />}
  </div>;
}
