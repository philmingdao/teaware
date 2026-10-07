'use client';

import { useLanguage } from './LanguageProvider';
import { artworkTitle, artworkDescription, term, museumName } from '@/lib/i18n';
import { artworks } from '@/data/artworks';
import Image from 'next/image';
import Link from '@/components/LocaleLink';
import { useState, type CSSProperties } from 'react';
import { withBasePath } from '@/lib/paths';
import styles from './CutoutGallery.module.css';

interface Sample {
  id: string;
  titleChinese: string;
  date: string;
  material: string;
  museum: string;
  sourceUrl: string;
  description: string;
  originalUrl: string;
  cutoutUrl: string;
  shadowBaselinePercent: number;
  shadowContactCenterPercent: number;
  shadowContactWidthPercent: number;
  shadowCastCenterPercent: number;
  shadowCastWidthPercent: number;
  shadowEnabled?: boolean;
}
type View = 'cutout' | 'original' | 'compare';

export default function CutoutGallery({ samples }: { samples: Sample[] }) {
  const { locale, t } = useLanguage();
  const [view, setView] = useState<View>('cutout');
  const [depth, setDepth] = useState(true);

  return (
    <section className={styles.gallery}>
      <div className={styles.intro}>
        <Link href="/gallery" className={styles.back}>← {t('backGallery')}</Link>
        <p className={styles.eyebrow}>{t('count', {count:samples.length})}</p>
        <h1>{t('closeLook')}</h1>
        <p className={styles.lead}>{t('closeIntro')}</p>
      </div>

      <div className={styles.controls}>
        <div className={styles.controlGroup} role="group" aria-label={t('imageView')}>
          {([['cutout', t('cutout')], ['original', t('original')], ['compare', t('compare')]] as const).map(([value, label]) => (
            <button key={value} aria-pressed={view === value} onClick={() => setView(value)}>{label}</button>
          ))}
        </div>
        <button className={styles.depthButton} aria-pressed={depth} disabled={view === 'original'} onClick={() => setDepth(!depth)}>{t('shadow')} {t(depth ? 'on' : 'off')}</button>
      </div>
      <p className={styles.hint}>{t('cutoutHint')}</p>

      <div className={`${styles.grid} ${view === 'compare' ? styles.comparisonGrid : ''}`}>
        {samples.map((sample, index) => {
          const record = artworks.find(item => item.id === sample.id)!;
          const title = artworkTitle(record, locale);
          return (
          <article key={sample.id} className={styles.card}>
            <div className={`${styles.images} ${view === 'compare' ? styles.pair : ''}`}>
              {view !== 'cutout' && (
                <a href={withBasePath(sample.originalUrl)} target="_blank" rel="noreferrer" className={styles.stage} aria-label={`${title} · ${t('original')}`}>
                  <Image src={withBasePath(sample.originalUrl)} alt={`${title} · ${t('original')}`} fill sizes={view === 'compare' ? '(max-width: 700px) 46vw, 25vw' : '(max-width: 700px) 92vw, 33vw'} className={styles.photo} priority={index < 3} />
                  <span className={styles.imageLabel}>{t('original')}</span>
                </a>
              )}
              {view !== 'original' && (
                <a href={withBasePath(sample.cutoutUrl)} target="_blank" rel="noreferrer" className={`${styles.stage} ${depth ? styles.depth : ''}`} style={{
                  '--shadow-baseline': `${sample.shadowBaselinePercent}%`,
                  '--shadow-contact-center': `${sample.shadowContactCenterPercent}%`,
                  '--shadow-contact-width': `${sample.shadowContactWidthPercent}%`,
                  '--shadow-cast-center': `${sample.shadowCastCenterPercent}%`,
                  '--shadow-cast-width': `${sample.shadowCastWidthPercent}%`,
                } as CSSProperties} aria-label={`${title} · ${t('cutout')}`}>
                  {depth && sample.shadowEnabled !== false && <>
                    <span className={styles.castShadow} aria-hidden="true" />
                    <span className={styles.contactShadow} aria-hidden="true" />
                  </>}
                  <Image src={withBasePath(sample.cutoutUrl)} alt={`${title} · ${t('cutout')}`} fill sizes={view === 'compare' ? '(max-width: 700px) 46vw, 25vw' : '(max-width: 700px) 92vw, 33vw'} className={styles.object} priority={index < 3} />
                  {view === 'compare' && <span className={styles.imageLabel}>{t('cutout')}</span>}
                </a>
              )}
            </div>
            <div className={styles.caption}>
              <p className={styles.date}>{record.date} <span>·</span> {term(record.material, locale, record.materialEnglish)}</p>
              <h2><a href={withBasePath(`/artwork/${encodeURIComponent(sample.id)}/`)}>{title}</a></h2>
              <p className={styles.description}>{locale === 'zh' ? sample.description : artworkDescription(record, locale)}</p>
              <a className={styles.source} href={sample.sourceUrl} target="_blank" rel="noreferrer">{museumName(record, locale)} ↗</a>
            </div>
          </article>
        ); })}
      </div>
    </section>
  );
}
