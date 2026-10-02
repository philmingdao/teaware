import { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import cutoutSamples from '@/data/cutout-samples.json';
import Footer from '@/components/Footer';
import GalleryGrid from '@/components/GalleryGrid';
import JsonLd from '@/components/JsonLd';
import { pageMetadata, createGalleryPageJsonLd, ogImage } from '@/lib/seo';

export const metadata: Metadata = {
  title: pageMetadata.gallery.title,
  description: pageMetadata.gallery.description,
  alternates: {
    canonical: pageMetadata.gallery.canonical,
  },
  openGraph: {
    title: `${pageMetadata.gallery.title} | 器 · 茶`,
    description: pageMetadata.gallery.description,
    url: pageMetadata.gallery.canonical,
    images: [ogImage],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${pageMetadata.gallery.title} | 器 · 茶`,
    description: pageMetadata.gallery.description,
    images: [ogImage.url],
  },
};

export default function GalleryPage() {
  return (
    <>
      <JsonLd data={createGalleryPageJsonLd()} />
      <main className="collection-surface flex-1">
        <Header />
        
        {/* Page Header */}
        <section className="pt-32 pb-12">
          <div className="max-w-7xl mx-auto px-6 lg:px-12 text-center">
            <span className="text-sm tracking-[0.3em] text-[#b8956c] dark:text-[#d4b896] uppercase font-serif-en">
              Collection Gallery
            </span>
            <h1 className="mt-4 text-4xl md:text-5xl font-medium tracking-wider text-[#1a1a1a] dark:text-[#e8e6e3]">
              藏品浏览
            </h1>
            <p className="mt-4 text-[#666] dark:text-[#9a9894] max-w-2xl mx-auto leading-relaxed">
              按朝代、材质或器型筛选，探索跨越千年的茶器之美
            </p>
            <Link href="/cutout-gallery" className="inline-block mt-5 text-sm text-[#9c7951] dark:text-[#d4b896] hover:underline underline-offset-4">
              器物近观 · {cutoutSamples.length}件透明底试展 →
            </Link>
          </div>
        </section>

        <GalleryGrid />
        <Footer />
      </main>
    </>
  );
}
