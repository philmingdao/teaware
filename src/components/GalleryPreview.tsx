'use client';

import { useLanguage } from './LanguageProvider';
import Link from '@/components/LocaleLink';
import { artworks } from '@/data/artworks';
import ArtworkCard from './ArtworkCard';

export default function GalleryPreview() {
  const { t } = useLanguage();
  const previewArtworks = artworks.slice(0, 8);

  return (
    <section className="collection-surface py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="text-sm tracking-[0.3em] text-[#b8956c] dark:text-[#d4b896] uppercase font-serif-en">
            Featured Collection
          </span>
          <h2 className="mt-4 text-3xl md:text-4xl font-medium tracking-wider text-[#1a1a1a] dark:text-[#e8e6e3]">
            {t('featured')}
          </h2>
          <p className="mt-4 text-[#666] dark:text-[#9a9894] max-w-2xl mx-auto leading-relaxed">
            {t('featuredIntro')}
          </p>
          <div className="divider-elegant"></div>
        </div>

        {/* Preview Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {previewArtworks.map((artwork, index) => (
            <ArtworkCard 
              key={artwork.id} 
              artwork={artwork} 
              index={index}
            />
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-12">
          <Link 
            href="/gallery" 
            className="btn-elegant"
          >
            {t('browseAll')}
            <span className="ml-2 text-sm font-serif-en">({artworks.length})</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
