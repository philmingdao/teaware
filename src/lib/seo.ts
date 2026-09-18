import type { Metadata } from 'next';
import { artworks } from '@/data/artworks';

export const SITE_URL = 'https://philmingdao.github.io';
export const BASE_PATH = '/teaware';
export const FULL_URL = `${SITE_URL}${BASE_PATH}`;

export const artworkCount = artworks.length;

export const siteConfig = {
  name: {
    zh: '器 · 茶',
    en: 'Chinese Tea Ware Gallery',
  },
  title: {
    zh: '器 · 茶 | 中国茶具艺术展',
    en: 'Qi · Cha | Chinese Tea Ware Artistic Gallery',
  },
  description: {
    zh: `探索跨越千年的中国茶具艺术。收录${artworkCount.toLocaleString()}余件博物馆级藏品，涵盖唐宋建盏、龙泉青瓷、宜兴紫砂、明清官窑等珍品。来自大都会艺术博物馆、克利夫兰艺术博物馆的开放藏品，采用CC0许可。`,
    en: `Explore the art of Chinese teaware across a thousand years. A museum-quality digital gallery featuring ${artworkCount.toLocaleString()}+ open-access artworks from The Metropolitan Museum of Art and Cleveland Museum of Art — Song dynasty Jian ware, Longquan celadon, Yixing zisha, Ming-Qing imperial porcelain. CC0 licensed.`,
  },
  keywords: {
    zh: ['中国茶具', '茶器艺术', '建盏', '龙泉青瓷', '紫砂壶', '青花瓷', '官窑', '宜兴紫砂', '宋代茶器', '明清瓷器', '茶道', '博物馆藏品', '数字展览'],
    en: ['Chinese tea ware', 'teapot', 'tea bowl', 'Jian ware', 'Longquan celadon', 'Yixing zisha', 'blue and white porcelain', 'imperial porcelain', 'museum collection', 'open access art', 'CC0 artwork', 'Asian ceramics'],
  },
  locale: 'zh_CN',
  alternateLocale: 'en_US',
  type: 'website',
  twitter: {
    card: 'summary_large_image',
    site: '@philmingdao',
  },
  artworkCount,
};

export const ogImage = {
  url: `${FULL_URL}/og-image.png`,
  width: 1200,
  height: 630,
  alt: '器 · 茶 - Chinese Tea Ware Artistic Gallery - 中国茶具艺术展',
  type: 'image/png',
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
  authors: [{ name: 'Chinese Tea Ware Gallery' }, { name: '器·茶数字展览' }],
  creator: 'philmingdao',
  publisher: 'Chinese Tea Ware Gallery',
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
      'zh-CN': FULL_URL,
      'en': FULL_URL,
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
    title: '器 · 茶 | 中国茶具艺术展 · 数字博物馆',
    titleEn: 'Qi · Cha | Chinese Tea Ware Digital Museum',
    description: `探索跨越千年的中国茶具艺术。${artworkCount.toLocaleString()}余件博物馆级开放藏品，涵盖唐宋建盏、龙泉青瓷、宜兴紫砂、明清官窑。Explore ${artworkCount.toLocaleString()}+ museum-quality Chinese teaware artworks.`,
    canonical: FULL_URL,
  },
  gallery: {
    title: '藏品浏览 · 茶器收藏',
    titleEn: 'Collection Gallery',
    description: '浏览中国茶具艺术展全部藏品。按朝代（唐宋元明清）、材质（青瓷、建盏、紫砂、青花）、器型分类筛选，探索跨越千年的茶器之美。Browse all Chinese teaware artworks by dynasty, material, and type.',
    canonical: `${FULL_URL}/gallery`,
  },
  about: {
    title: '关于展览 · 策展理念与数据来源',
    titleEn: 'About the Exhibition',
    description: '了解「器 · 茶」数字展览的策展理念。藏品来自大都会艺术博物馆、克利夫兰艺术博物馆开放数据，采用CC0公共领域许可。Learn about our curatorial vision and open-access data sources.',
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
      name: 'Chinese Tea Ware / 中国茶具',
      description: 'Historic Chinese teapots, tea bowls, and tea ceremony vessels across dynasties',
    },
    provider: {
      '@type': 'Organization',
      name: 'Chinese Tea Ware Gallery',
      url: FULL_URL,
    },
    numberOfItems: siteConfig.artworkCount,
    license: 'https://creativecommons.org/publicdomain/zero/1.0/',
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
    url: `${FULL_URL}/artwork/${artwork.id}`,
    dateCreated: artwork.date,
    artMedium: `${artwork.material} / ${artwork.materialEnglish}`,
    artworkSurface: artwork.kiln ? `${artwork.kiln} / ${artwork.kilnEnglish}` : undefined,
    locationCreated: {
      '@type': 'Place',
      name: 'China / 中国',
    },
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
    license: 'https://creativecommons.org/publicdomain/zero/1.0/',
    identifier: artwork.accessionNumber,
  };
}
