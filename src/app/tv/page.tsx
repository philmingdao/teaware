import { Metadata } from 'next';
import { Suspense } from 'react';
import TVMode from '@/components/TVMode';
import { pageMetadata, ogImage } from '@/lib/seo';

export const metadata: Metadata = {
  title: pageMetadata.tv.title,
  description: pageMetadata.tv.description,
  alternates: {
    canonical: pageMetadata.tv.canonical,
  },
  openGraph: {
    title: `${pageMetadata.tv.title} | 器 · 茶`,
    description: pageMetadata.tv.description,
    url: pageMetadata.tv.canonical,
    images: [ogImage],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${pageMetadata.tv.title} | 器 · 茶`,
    description: pageMetadata.tv.description,
    images: [ogImage.url],
  },
};

function TVLoading() {
  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
    </div>
  );
}

export default function TVPage() {
  return (
    <Suspense fallback={<TVLoading />}>
      <TVMode />
    </Suspense>
  );
}
