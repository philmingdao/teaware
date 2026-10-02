'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
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
  contactBottomPercent?: number;
  contactWidthPercent?: number;
}
type Surface = 'paper' | 'dark' | 'checker';
type View = 'cutout' | 'original' | 'compare';

export default function CutoutGallery({ samples }: { samples: Sample[] }) {
  const [surface, setSurface] = useState<Surface>('paper');
  const [view, setView] = useState<View>('cutout');
  const [depth, setDepth] = useState(true);

  return (
    <section className={styles.gallery}>
      <div className={styles.intro}>
        <Link href="/gallery" className={styles.back}>← 返回藏品浏览</Link>
        <p className={styles.eyebrow}>A CLOSER LOOK · 20 件试展</p>
        <h1>器物近观</h1>
        <p className={styles.lead}>让背景退去，让器物走近。<br />从釉色到轮廓，重新看见一件茶器的分量。</p>
      </div>

      <div className={styles.controls}>
        <div className={styles.controlGroup} role="group" aria-label="展示背景">
          <span>背景</span>
          {([['paper', '暖白'], ['dark', '深灰'], ['checker', '棋盘格']] as const).map(([value, label]) => (
            <button key={value} aria-pressed={surface === value} onClick={() => setSurface(value)}>{label}</button>
          ))}
        </div>
        <div className={styles.controlGroup} role="group" aria-label="图片视图">
          {([['cutout', '透明底'], ['original', '原图'], ['compare', '并排对照']] as const).map(([value, label]) => (
            <button key={value} aria-pressed={view === value} onClick={() => setView(value)}>{label}</button>
          ))}
        </div>
        <button className={styles.depthButton} aria-pressed={depth} onClick={() => setDepth(!depth)}>立体投影 {depth ? '开' : '关'}</button>
      </div>
      <p className={styles.hint}>本页为 AI 去背景效果试样，器物细节以馆藏原图为准。切换背景检查边缘，选择并排对照核对细节；图片可点开近看。</p>

      <div className={`${styles.grid} ${view === 'compare' ? styles.comparisonGrid : ''}`}>
        {samples.map((sample, index) => (
          <article key={sample.id} className={styles.card}>
            <div className={`${styles.images} ${view === 'compare' ? styles.pair : ''}`}>
              {view !== 'cutout' && (
                <a href={withBasePath(sample.originalUrl)} target="_blank" rel="noreferrer" className={`${styles.stage} ${styles.original}`} aria-label={`近看${sample.titleChinese}原图`}>
                  <Image src={withBasePath(sample.originalUrl)} alt={`${sample.titleChinese}馆藏原图`} fill sizes={view === 'compare' ? '(max-width: 700px) 46vw, 25vw' : '(max-width: 700px) 92vw, 33vw'} className={styles.photo} priority={index < 3} />
                  <span className={styles.imageLabel}>馆藏原图</span>
                </a>
              )}
              {view !== 'original' && (
                <a href={withBasePath(sample.cutoutUrl)} target="_blank" rel="noreferrer" className={`${styles.stage} ${styles[surface]} ${depth && surface !== 'checker' ? styles.depth : ''}`} aria-label={`近看${sample.titleChinese}透明底图片`}>
                  {depth && surface !== 'checker' && <span className={styles.contactShadow} style={{ bottom: `${sample.contactBottomPercent ?? 9}%`, width: `${sample.contactWidthPercent ?? 44}%`, left: `${50 - (sample.contactWidthPercent ?? 44) / 2}%`, right: 'auto' }} aria-hidden="true" />}
                  <Image src={withBasePath(sample.cutoutUrl)} alt={`${sample.titleChinese}透明背景照片`} fill sizes={view === 'compare' ? '(max-width: 700px) 46vw, 25vw' : '(max-width: 700px) 92vw, 33vw'} className={styles.object} priority={index < 3} />
                  {view === 'compare' && <span className={styles.imageLabel}>透明底</span>}
                </a>
              )}
            </div>
            <div className={styles.caption}>
              <p className={styles.date}>{sample.date} <span>·</span> {sample.material}</p>
              <h2><Link href={`/artwork?id=${sample.id}`}>{sample.titleChinese}</Link></h2>
              <p className={styles.description}>{sample.description}</p>
              <a className={styles.source} href={sample.sourceUrl} target="_blank" rel="noreferrer">{sample.museum} ↗</a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
