'use client';

import { useState, useMemo } from 'react';
import { artworks, dynasties, materials, objectTypes, museums } from '@/data/artworks';
import ArtworkCard from './ArtworkCard';

type FilterType = 'dynasty' | 'material' | 'objectType' | 'museum';

const ITEMS_PER_PAGE = 24;

export default function GalleryGrid() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('dynasty');
  const [selectedValue, setSelectedValue] = useState<string>('全部');
  const [currentPage, setCurrentPage] = useState(1);

  const filterOptions = useMemo(() => {
    switch (activeFilter) {
      case 'dynasty':
        return ['全部', ...dynasties];
      case 'material':
        return ['全部', ...materials];
      case 'objectType':
        return ['全部', ...objectTypes];
      case 'museum':
        return ['全部', ...museums];
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
        case 'museum':
          return artwork.sourceMuseum === selectedValue;
        default:
          return true;
      }
    });
  }, [activeFilter, selectedValue]);

  const totalPages = Math.ceil(filteredArtworks.length / ITEMS_PER_PAGE);
  
  const paginatedArtworks = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredArtworks.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredArtworks, currentPage]);

  const handleFilterTypeChange = (type: FilterType) => {
    setActiveFilter(type);
    setSelectedValue('全部');
    setCurrentPage(1);
  };

  const handleFilterValueChange = (value: string) => {
    setSelectedValue(value);
    setCurrentPage(1);
  };

  const filterTypeLabels: Record<FilterType, { chinese: string; english: string }> = {
    dynasty: { chinese: '朝代', english: 'Dynasty' },
    material: { chinese: '材质', english: 'Material' },
    objectType: { chinese: '器型', english: 'Type' },
    museum: { chinese: '来源', english: 'Museum' },
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
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
          <div className="flex flex-wrap justify-center gap-1 mb-6">
            {(Object.keys(filterTypeLabels) as FilterType[]).map((type) => (
              <button
                key={type}
                onClick={() => handleFilterTypeChange(type)}
                className={`px-4 sm:px-6 py-2 text-sm tracking-wider transition-all ${
                  activeFilter === type
                    ? 'bg-[#1a1a1a] text-[#faf9f7]'
                    : 'bg-transparent text-[#666] hover:text-[#1a1a1a]'
                }`}
              >
                {filterTypeLabels[type].chinese}
                <span className="ml-1 sm:ml-2 text-xs font-serif-en opacity-60">
                  {filterTypeLabels[type].english}
                </span>
              </button>
            ))}
          </div>

          {/* Filter Options */}
          <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
            {filterOptions.map((option) => (
              <button
                key={option}
                onClick={() => handleFilterValueChange(option)}
                className={`filter-btn ${selectedValue === option ? 'active' : ''}`}
              >
                {option}
              </button>
            ))}
          </div>

          {/* Results Count */}
          <p className="text-center mt-6 text-sm text-[#999]">
            共 <span className="text-[#b8956c]">{filteredArtworks.length}</span> 件藏品
            {totalPages > 1 && (
              <span className="ml-2">
                · 第 {currentPage}/{totalPages} 页
              </span>
            )}
          </p>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedArtworks.map((artwork, index) => (
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-12">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm border border-[#ddd] rounded hover:bg-[#1a1a1a] hover:text-white hover:border-[#1a1a1a] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#1a1a1a] disabled:hover:border-[#ddd] transition-colors"
            >
              ← 上一页
            </button>
            
            <div className="flex gap-1">
              {getPageNumbers().map((page, idx) => (
                typeof page === 'number' ? (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 text-sm rounded transition-colors ${
                      currentPage === page
                        ? 'bg-[#1a1a1a] text-white'
                        : 'hover:bg-[#eee]'
                    }`}
                  >
                    {page}
                  </button>
                ) : (
                  <span key={idx} className="w-10 h-10 flex items-center justify-center text-[#999]">
                    {page}
                  </span>
                )
              ))}
            </div>
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm border border-[#ddd] rounded hover:bg-[#1a1a1a] hover:text-white hover:border-[#1a1a1a] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#1a1a1a] disabled:hover:border-[#ddd] transition-colors"
            >
              下一页 →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
