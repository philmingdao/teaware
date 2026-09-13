'use client';

import { useState, useMemo } from 'react';
import { artworks, dynasties, materials, objectTypes } from '@/data/artworks';
import ArtworkCard from './ArtworkCard';

type FilterType = 'dynasty' | 'material' | 'objectType';

export default function GalleryGrid() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('dynasty');
  const [selectedValue, setSelectedValue] = useState<string>('全部');

  const filterOptions = useMemo(() => {
    switch (activeFilter) {
      case 'dynasty':
        return ['全部', ...dynasties];
      case 'material':
        return ['全部', ...materials];
      case 'objectType':
        return ['全部', ...objectTypes];
      default:
        return ['全部'];
    }
  }, [activeFilter]);

  const filteredArtworks = useMemo(() => {
    if (selectedValue === '全部') return artworks;
    
    return artworks.filter(artwork => {
      switch (activeFilter) {
        case 'dynasty':
          return artwork.dynasty === selectedValue;
        case 'material':
          return artwork.material === selectedValue;
        case 'objectType':
          return artwork.objectType === selectedValue;
        default:
          return true;
      }
    });
  }, [activeFilter, selectedValue]);

  const handleFilterTypeChange = (type: FilterType) => {
    setActiveFilter(type);
    setSelectedValue('全部');
  };

  const filterTypeLabels: Record<FilterType, { chinese: string; english: string }> = {
    dynasty: { chinese: '朝代', english: 'Dynasty' },
    material: { chinese: '材质', english: 'Material' },
    objectType: { chinese: '器型', english: 'Type' },
  };

  return (
    <section className="py-20 bg-[#f5f3ef]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-medium tracking-wider text-[#1a1a1a]">
            藏品浏览
          </h2>
          <p className="mt-2 text-sm text-[#666] font-serif-en tracking-wide">
            Collection Gallery
          </p>
          <div className="divider-elegant"></div>
        </div>

        {/* Filter Controls */}
        <div className="mb-12">
          {/* Filter Type Tabs */}
          <div className="flex justify-center gap-1 mb-6">
            {(Object.keys(filterTypeLabels) as FilterType[]).map((type) => (
              <button
                key={type}
                onClick={() => handleFilterTypeChange(type)}
                className={`px-6 py-2 text-sm tracking-wider transition-all ${
                  activeFilter === type
                    ? 'bg-[#1a1a1a] text-[#faf9f7]'
                    : 'bg-transparent text-[#666] hover:text-[#1a1a1a]'
                }`}
              >
                {filterTypeLabels[type].chinese}
                <span className="ml-2 text-xs font-serif-en opacity-60">
                  {filterTypeLabels[type].english}
                </span>
              </button>
            ))}
          </div>

          {/* Filter Options */}
          <div className="flex flex-wrap justify-center gap-2">
            {filterOptions.map((option) => (
              <button
                key={option}
                onClick={() => setSelectedValue(option)}
                className={`filter-btn ${selectedValue === option ? 'active' : ''}`}
              >
                {option}
              </button>
            ))}
          </div>

          {/* Results Count */}
          <p className="text-center mt-6 text-sm text-[#999]">
            共 <span className="text-[#b8956c]">{filteredArtworks.length}</span> 件藏品
          </p>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredArtworks.map((artwork, index) => (
            <ArtworkCard 
              key={artwork.id} 
              artwork={artwork} 
              index={index}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredArtworks.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[#666]">暂无符合条件的藏品</p>
          </div>
        )}
      </div>
    </section>
  );
}
