'use client';

import type { CSSProperties } from 'react';
import { getCollectionCutout } from '@/lib/collection-images';
import ResilientImage from './ResilientImage';
import styles from './ArtifactImage.module.css';

interface Props {
  id: string;
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  interactive?: boolean;
  className?: string;
}

export default function ArtifactImage({ id, src, alt, sizes, priority, interactive, className = '' }: Props) {
  const cutout = getCollectionCutout(id);
  const grounding = cutout ? {
    '--shadow-baseline': `${cutout.shadowBaselinePercent}%`,
    '--shadow-contact-center': `${cutout.shadowContactCenterPercent}%`,
    '--shadow-contact-width': `${cutout.shadowContactWidthPercent}%`,
    '--shadow-cast-center': `${cutout.shadowCastCenterPercent}%`,
    '--shadow-cast-width': `${cutout.shadowCastWidthPercent}%`,
  } as CSSProperties : undefined;
  return <div className={`${styles.stage} ${interactive ? styles.interactive : ''} ${className}`} style={grounding}>
    {cutout?.shadowEnabled && <><span className={styles.cast} aria-hidden /><span className={styles.contact} aria-hidden /></>}
    <ResilientImage key={cutout?.url ?? src} src={cutout?.url ?? src} alt={alt} fill sizes={sizes}
      priority={priority} objectFit="contain" className={styles.image} />
  </div>;
}
