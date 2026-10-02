import type { Metadata } from 'next';
import { artworks } from '@/data/artworks';

export const SITE_URL = 'https://philmingdao.github.io';
export const BASE_PATH = '/teaware';
export const FULL_URL = `${SITE_URL}${BASE_PATH}`;

export const artworkCount = artworks.length;

export const siteConfig = {
  name: {
    zh: '器 · 茶',
    en: 'East Asian Teaware Art Exhibition',
  },
  title: {
    zh: '器 · 茶 | 东亚茶器艺术展',
    en: 'Qi · Cha | East Asian Teaware Art Exhibition',
  },
  description: {
    zh: `东亚茶器艺术展，收录${artworkCount.toLocaleString()}件开放馆藏。探索中国、日本与韩国的茶器传统，以及茶文化的跨文化交流。作品信息与许可以各馆来源为准。`,
    en: `Explore ${artworkCount.toLocaleString()} open museum artworks: the teaware traditions of China, Japan and Korea, and tea culture’s global exchanges. See each artwork for source information and licensing.`,
  },
  keywords: {
    zh: ['东亚茶器', '日本茶器', '韩国茶器', '茶器艺术', '建盏', '龙泉青瓷', '紫砂壶', '青花瓷', '官窑', '宜兴紫砂', '宋代茶器', '明清瓷器', '茶道', '博物馆藏品', '数字展览'],
    en: ['East Asian teaware', 'Japanese teaware', 'Korean teaware', 'teapot', 'tea bowl', 'Jian ware', 'Longquan celadon', 'Yixing zisha', 'blue and white porcelain', 'imperial porcelain', 'museum collection', 'open access art', 'CC0 artwork', 'Asian ceramics'],
  },
  locale: 'zh_CN',
  alternateLocale: ['en_US', 'ja_JP', 'ko_KR'],
  type: 'website',
  twitter: {
    card: 'summary_large_image',
    site: '@philmingdao',
  },
  artworkCount,
};

export const ogImage = {
  url: `${FULL_URL}/collection-cutouts/82ff3cdb92296b03d949de0010173465d07de83d1c5fffa07ce27f4270f3e3a8.webp`,
  width: 1200,
  height: 1200,
  alt: '器 · 茶 - East Asian Teaware Art Exhibition - 东亚茶器艺术展',
  type: 'image/webp',
};

export function createCanonicalUrl(path: string = ''): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${FULL_URL}${cleanPath === '/' ? '' : cleanPath}`;
}

export const defaultMetadata: Metadata = {
  metadataBase: new URL(FULL_URL),
  title: {
    default: siteConfig.title.zh,
    template: `%s | ${siteConfig.name.zh}`,
  },
  description: siteConfig.description.zh,
  keywords: [...siteConfig.keywords.zh, ...siteConfig.keywords.en],
  authors: [{ name: 'East Asian Teaware Art Exhibition' }, { name: '器·茶数字展览' }],
  creator: 'philmingdao',
  publisher: 'East Asian Teaware Art Exhibition',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: FULL_URL,
    languages: {
      'zh-CN': `${FULL_URL}/?lang=zh`,
      'en': `${FULL_URL}/?lang=en`,
      'ja': `${FULL_URL}/?lang=ja`,
      'ko': `${FULL_URL}/?lang=ko`,
    },
  },
  openGraph: {
    type: 'website',
    locale: siteConfig.locale,
    alternateLocale: siteConfig.alternateLocale,
    url: FULL_URL,
    siteName: siteConfig.name.zh,
    title: siteConfig.title.zh,
    description: siteConfig.description.zh,
    images: [ogImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title.zh,
    description: siteConfig.description.zh,
    images: [ogImage.url],
    creator: '@philmingdao',
  },
  icons: {
    icon: `${BASE_PATH}/favicon.ico`,
  },
  verification: {},
  category: 'art',
};

export const pageMetadata = {
  home: {
    title: '器 · 茶 | 东亚茶器艺术展 · 数字博物馆',
    titleEn: 'Qi · Cha | East Asian Teaware Digital Exhibition',
    description: siteConfig.description.zh,
    canonical: FULL_URL,
  },
  gallery: {
    title: '藏品浏览 · 茶器收藏',
    titleEn: 'Collection Gallery',
    description: '浏览东亚茶器艺术展全部藏品，按时代与地区、材质、器型和来源筛选。Browse East Asian teaware and cultural exchange.',
    canonical: `${FULL_URL}/gallery`,
  },
  about: {
    title: '关于展览 · 策展理念与数据来源',
    titleEn: 'About the Exhibition',
    description: '了解东亚茶器艺术展的策展理念、当前收录来源和作品许可。Learn about East Asian teaware, collection sources and licensing.',
    canonical: `${FULL_URL}/about`,
  },
  tv: {
    title: '电视模式 · 沉浸式全屏展览',
    titleEn: 'TV Mode · Immersive Gallery',
    description: '电视/大屏全屏展览模式。Netflix风格沉浸式茶器艺术浏览，支持自动播放、键盘操控。Fullscreen immersive gallery experience for large displays.',
    canonical: `${FULL_URL}/tv`,
  },
};

export interface JsonLdOrganization {
  '@type': 'Organization';
  name: string;
  url: string;
  logo?: string;
}

export interface JsonLdCollectionPage {
  '@context': 'https://schema.org';
  '@type': 'CollectionPage';
  name: string;
  description: string;
  url: string;
  image?: string;
  isPartOf?: {
    '@type': 'WebSite';
    name: string;
    url: string;
  };
  about?: {
    '@type': 'Thing';
    name: string;
    description?: string;
  };
  provider?: JsonLdOrganization;
  numberOfItems?: number;
  license?: string;
}

export interface JsonLdArtwork {
  '@context': 'https://schema.org';
  '@type': 'VisualArtwork';
  name: string;
  alternateName?: string;
  description?: string;
  image?: string;
  url?: string;
  dateCreated?: string;
  artMedium?: string;
  artworkSurface?: string;
  creator?: {
    '@type': 'Organization' | 'Person';
    name: string;
  };
  locationCreated?: {
    '@type': 'Place';
    name: string;
  };
  isPartOf?: {
    '@type': 'Collection';
    name: string;
    url?: string;
  };
  provider?: JsonLdOrganization;
  license?: string;
  acquiredFrom?: string;
  identifier?: string;
}

export function createCollectionPageJsonLd(overrides?: Partial<JsonLdCollectionPage>): JsonLdCollectionPage {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: siteConfig.title.zh,
    description: siteConfig.description.zh,
    url: FULL_URL,
    image: ogImage.url,
    isPartOf: {
      '@type': 'WebSite',
      name: siteConfig.name.zh,
      url: FULL_URL,
    },
    about: {
      '@type': 'Thing',
      name: 'East Asian Teaware / 东亚茶器',
      description: 'East Asian teaware traditions and their global cultural exchanges',
    },
    provider: {
      '@type': 'Organization',
      name: 'East Asian Teaware Art Exhibition',
      url: FULL_URL,
    },
    numberOfItems: siteConfig.artworkCount,
    ...overrides,
  };
}

export function createGalleryPageJsonLd(): JsonLdCollectionPage {
  return createCollectionPageJsonLd({
    '@type': 'CollectionPage',
    name: '藏品浏览 | 器 · 茶',
    description: pageMetadata.gallery.description,
    url: pageMetadata.gallery.canonical,
  });
}

export function createArtworkJsonLd(artwork: {
  id: string;
  titleChinese: string;
  titleEnglish: string;
  description: string;
  imageUrl: string;
  date: string;
  material: string;
  materialEnglish: string;
  sourceMuseum: string;
  sourceMuseumEnglish: string;
  sourceUrl: string;
  accessionNumber: string;
  license: string;
  kiln?: string;
  kilnEnglish?: string;
}): JsonLdArtwork {
  const imageUrl = artwork.imageUrl.startsWith('http') 
    ? artwork.imageUrl 
    : `${FULL_URL}${artwork.imageUrl}`;
    
  return {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: artwork.titleChinese,
    alternateName: artwork.titleEnglish,
    description: artwork.description,
    image: imageUrl,
    url: `${FULL_URL}/artwork?id=${artwork.id}`,
    dateCreated: artwork.date,
    artMedium: `${artwork.material} / ${artwork.materialEnglish}`,
    artworkSurface: artwork.kiln ? `${artwork.kiln} / ${artwork.kilnEnglish}` : undefined,
    isPartOf: {
      '@type': 'Collection',
      name: artwork.sourceMuseumEnglish,
      url: artwork.sourceUrl,
    },
    provider: {
      '@type': 'Organization',
      name: artwork.sourceMuseumEnglish,
      url: artwork.sourceUrl.split('/art/')[0] || artwork.sourceUrl,
    },
    identifier: artwork.accessionNumber,
  };
}
