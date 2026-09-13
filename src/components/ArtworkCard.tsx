'use client';

import Link from 'next/link';
import { Artwork } from '@/types/artwork';
import ResilientImage from './ResilientImage';

interface ArtworkCardProps {
  artwork: Artwork;
  index?: number;
}

export default function ArtworkCard({ artwork, index = 0 }: ArtworkCardProps) {
  return (
    <Link 
      href={`/artwork/${artwork.id}`}
      className="group gallery-item block bg-[#faf9f7] rounded-sm overflow-hidden"
      style={{ 
        animationDelay: `${index * 0.1}s`,
        opacity: 0,
        animation: 'fadeInUp 0.6s ease-out forwards'
      }}
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-[#ebe8e1]">
        <ResilientImage
          src={artwork.imageUrl}
          alt={artwork.imageAlt}
          fill
          className="transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        
        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-[#1a1a1a]/0 group-hover:bg-[#1a1a1a]/20 transition-colors duration-500"></div>
        
        {/* Dynasty badge */}
        <div className="absolute top-4 left-4">
          <span className="inline-block px-3 py-1 text-xs tracking-wider bg-[#faf9f7]/90 text-[#1a1a1a] backdrop-blur-sm">
            {artwork.dynasty}代
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-medium text-[#1a1a1a] group-hover:text-[#b8956c] transition-colors line-clamp-2">
          {artwork.titleChinese}
        </h3>
        <p className="mt-1 text-sm text-[#666] font-serif-en line-clamp-1">
          {artwork.titleEnglish}
        </p>
        
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-xs text-[#999]">
            {artwork.material}
          </span>
          <span className="text-xs text-[#ccc]">·</span>
          <span className="text-xs text-[#999]">
            {artwork.objectType}
          </span>
        </div>
        
        {artwork.kiln && (
          <p className="mt-2 text-xs text-[#b8956c]">
            {artwork.kiln}
          </p>
        )}
      </div>
    </Link>
  );
}
