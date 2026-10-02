'use client';

import { useLanguage } from './LanguageProvider';
import { artworkTitle, artworkType, periodName, term } from '@/lib/i18n';
import Link from '@/components/LocaleLink';
import { Artwork } from '@/types/artwork';
import ArtifactImage from './ArtifactImage';

interface ArtworkCardProps {
  artwork: Artwork;
  index?: number;
}

export default function ArtworkCard({ artwork, index = 0 }: ArtworkCardProps) {
  const { locale } = useLanguage();
  return (
    <Link 
      href={`/artwork?id=${artwork.id}`}
      className="group gallery-item block bg-transparent"
      style={{ 
        animationDelay: `${index * 0.1}s`,
        opacity: 0,
        animation: 'fadeInUp 0.6s ease-out forwards'
      }}
    >
      {/* Image Container */}
      <div className="relative aspect-square">
        <ArtifactImage
          id={artwork.id}
          src={artwork.imageUrl}
          alt={artworkTitle(artwork, locale)}
          interactive
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        
        {/* Dynasty badge */}
        <div className="absolute top-4 left-4">
          <span className="inline-block px-3 py-1 text-xs tracking-wider bg-[#faf9f7]/90 dark:bg-[#0f0f0e]/90 text-[#1a1a1a] dark:text-[#e8e6e3] backdrop-blur-sm">
            {periodName(artwork.dynasty, locale, artwork.dynastyEnglish)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-medium text-[#1a1a1a] dark:text-[#e8e6e3] group-hover:text-[#b8956c] dark:group-hover:text-[#d4b896] transition-colors line-clamp-2">
          {artworkTitle(artwork, locale)}
        </h3>
        {locale !== 'en' && artwork.titleEnglish && <p className="mt-1 text-sm text-[#666] dark:text-[#9a9894] font-serif-en line-clamp-1">
          {artwork.titleEnglish}
        </p>}
        
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs text-[#999] dark:text-[#6e6c68]">
            {term(artwork.material, locale, artwork.materialEnglish)}
          </span>
          <span className="text-xs text-[#ccc] dark:text-[#3d3b38]">·</span>
          <span className="text-xs text-[#999] dark:text-[#6e6c68]">
            {artworkType(artwork, locale)}
          </span>
        </div>
        
        {artwork.kiln && (
          <p className="mt-2 text-xs text-[#b8956c] dark:text-[#d4b896]">
            {term(artwork.kiln, locale, artwork.kilnEnglish)}
          </p>
        )}
      </div>
    </Link>
  );
}
