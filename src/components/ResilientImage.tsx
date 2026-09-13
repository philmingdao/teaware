'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';

interface ResilientImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
  objectFit?: 'contain' | 'cover';
}

export default function ResilientImage({
  src,
  alt,
  fill,
  width,
  height,
  className = '',
  sizes,
  priority,
  objectFit = 'cover',
}: ResilientImageProps) {
  const [errorCount, setErrorCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = useCallback(() => {
    setErrorCount(prev => prev + 1);
    setIsLoading(false);
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const showPlaceholder = errorCount >= 2;
  const useNativeFallback = errorCount === 1;

  if (showPlaceholder) {
    return (
      <div 
        className={`flex items-center justify-center bg-[#ebe8e1] ${className}`}
        style={fill ? { position: 'absolute', inset: 0 } : { width, height }}
      >
        <div className="text-center p-4">
          <svg 
            className="w-12 h-12 mx-auto mb-2 text-[#ccc]" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1} 
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2 2v12a2 2 0 002 2z" 
            />
          </svg>
          <p className="text-xs text-[#999]">暂无图片</p>
        </div>
      </div>
    );
  }

  if (useNativeFallback) {
    return (
      <>
        {isLoading && (
          <div 
            className={`flex items-center justify-center bg-[#ebe8e1] animate-pulse ${fill ? 'absolute inset-0' : ''}`}
            style={!fill ? { width, height } : undefined}
          />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={`${fill ? 'absolute inset-0 w-full h-full' : ''} ${className} ${objectFit === 'contain' ? 'object-contain' : 'object-cover'} transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          style={!fill ? { width, height } : undefined}
          onError={handleError}
          onLoad={handleLoad}
          referrerPolicy="no-referrer"
          loading={priority ? 'eager' : 'lazy'}
        />
      </>
    );
  }

  return (
    <>
      {isLoading && (
        <div 
          className={`flex items-center justify-center bg-[#ebe8e1] animate-pulse ${fill ? 'absolute inset-0' : ''}`}
          style={!fill ? { width, height } : undefined}
        >
          <svg 
            className="w-8 h-8 text-[#ccc] animate-spin" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      )}
      <Image
        src={src}
        alt={alt}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        className={`${className} ${objectFit === 'contain' ? 'object-contain' : 'object-cover'} transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        sizes={sizes}
        priority={priority}
        onError={handleError}
        onLoad={handleLoad}
        referrerPolicy="no-referrer"
      />
    </>
  );
}
