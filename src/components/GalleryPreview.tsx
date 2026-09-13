'use client';

import Link from 'next/link';
import { artworks } from '@/data/artworks';
import ArtworkCard from './ArtworkCard';

export default function GalleryPreview() {
  const previewArtworks = artworks.slice(0, 8);

  return (
    <section className="py-24 bg-[#f5f3ef]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="text-sm tracking-[0.3em] text-[#b8956c] uppercase font-serif-en">
            Featured Collection
          </span>
          <h2 className="mt-4 text-3xl md:text-4xl font-medium tracking-wider text-[#1a1a1a]">
            精选藏品
          </h2>
          <p className="mt-4 text-[#666] max-w-2xl mx-auto leading-relaxed">
            从宋代建盏的深沉到清代瓷器的华美，每一件藏品都是时代审美与工艺智慧的结晶
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
            浏览全部藏品
            <span className="ml-2 text-sm font-serif-en">({artworks.length})</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
