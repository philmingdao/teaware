'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { artworks, dynasties, materials, objectTypes, museums } from '@/data/artworks';
import ArtworkCard from './ArtworkCard';
import { useSlideshowContext } from './SlideshowProvider';

type FilterType = 'dynasty' | 'material' | 'objectType' | 'museum';

const ITEMS_PER_PAGE = 24;

export default function GalleryGrid() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('dynasty');
  const [selectedValue, setSelectedValue] = useState<string>('全部');
  const [currentPage, setCurrentPage] = useState(1);
  const { openSlideshow } = useSlideshowContext();

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
    <section className="py-20 bg-[#f5f3ef] dark:bg-[#171614]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-medium tracking-wider text-[#1a1a1a] dark:text-[#e8e6e3]">
            藏品浏览
          </h2>
          <p className="mt-2 text-sm text-[#666] dark:text-[#9a9894] font-serif-en tracking-wide">
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
                    ? 'bg-[#1a1a1a] dark:bg-[#e8e6e3] text-[#faf9f7] dark:text-[#0f0f0e]'
                    : 'bg-transparent text-[#666] dark:text-[#9a9894] hover:text-[#1a1a1a] dark:hover:text-[#e8e6e3]'
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

          {/* Results Count & View Mode Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
            <p className="text-sm text-[#999] dark:text-[#6e6c68]">
              共 <span className="text-[#b8956c] dark:text-[#d4b896]">{filteredArtworks.length}</span> 件藏品
              {totalPages > 1 && (
                <span className="ml-2">
                  · 第 {currentPage}/{totalPages} 页
                </span>
              )}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => openSlideshow(filteredArtworks, 0)}
                className="inline-flex items-center gap-2 px-4 py-2 border border-[#1a1a1a] dark:border-[#e8e6e3] text-[#1a1a1a] dark:text-[#e8e6e3] hover:bg-[#1a1a1a] dark:hover:bg-[#e8e6e3] hover:text-[#faf9f7] dark:hover:text-[#0f0f0e] text-sm tracking-wider transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                <span>幻灯</span>
              </button>
              <Link
                href={selectedValue !== '全部' && (activeFilter === 'museum' || activeFilter === 'dynasty')
                  ? `/tv?${activeFilter}=${encodeURIComponent(selectedValue)}`
                  : '/tv'}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] dark:bg-[#e8e6e3] text-[#faf9f7] dark:text-[#0f0f0e] hover:bg-[#333] dark:hover:bg-[#c5c3bf] text-sm tracking-wider transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>电视模式</span>
                <span className="font-serif-en text-xs opacity-60">TV</span>
              </Link>
            </div>
          </div>
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
            <p className="text-[#666] dark:text-[#9a9894]">暂无符合条件的藏品</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-12">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm border border-[#ddd] dark:border-[#3d3b38] rounded hover:bg-[#1a1a1a] dark:hover:bg-[#e8e6e3] hover:text-white dark:hover:text-[#0f0f0e] hover:border-[#1a1a1a] dark:hover:border-[#e8e6e3] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#1a1a1a] dark:disabled:hover:text-[#e8e6e3] disabled:hover:border-[#ddd] dark:disabled:hover:border-[#3d3b38] transition-colors"
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
                        ? 'bg-[#1a1a1a] dark:bg-[#e8e6e3] text-white dark:text-[#0f0f0e]'
                        : 'hover:bg-[#eee] dark:hover:bg-[#252320]'
                    }`}
                  >
                    {page}
                  </button>
                ) : (
                  <span key={idx} className="w-10 h-10 flex items-center justify-center text-[#999] dark:text-[#6e6c68]">
                    {page}
                  </span>
                )
              ))}
            </div>
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm border border-[#ddd] dark:border-[#3d3b38] rounded hover:bg-[#1a1a1a] dark:hover:bg-[#e8e6e3] hover:text-white dark:hover:text-[#0f0f0e] hover:border-[#1a1a1a] dark:hover:border-[#e8e6e3] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#1a1a1a] dark:disabled:hover:text-[#e8e6e3] disabled:hover:border-[#ddd] dark:disabled:hover:border-[#3d3b38] transition-colors"
            >
              下一页 →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
