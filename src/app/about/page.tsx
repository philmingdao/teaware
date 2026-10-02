import { Metadata } from 'next';
import AboutContent from '@/components/AboutContent';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import JsonLd from '@/components/JsonLd';
import { pageMetadata, ogImage, FULL_URL } from '@/lib/seo';

export const metadata: Metadata = {
  title: pageMetadata.about.title,
  description: pageMetadata.about.description,
  alternates: {
    canonical: pageMetadata.about.canonical,
  },
  openGraph: {
    title: `${pageMetadata.about.title} | 器 · 茶`,
    description: pageMetadata.about.description,
    url: pageMetadata.about.canonical,
    images: [ogImage],
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${pageMetadata.about.title} | 器 · 茶`,
    description: pageMetadata.about.description,
    images: [ogImage.url],
  },
};

const aboutPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: pageMetadata.about.title,
  description: pageMetadata.about.description,
  url: pageMetadata.about.canonical,
  mainEntity: {
    '@type': 'WebSite',
    name: '器 · 茶 | 东亚茶器艺术展',
    url: FULL_URL,
  },
  isPartOf: {
    '@type': 'WebSite',
    name: '器 · 茶',
    url: FULL_URL,
  },
};

export default function AboutPage() {
  return (
    <>
      <JsonLd data={aboutPageJsonLd} />
      <main className="flex-1">
        <Header />
      
      <AboutContent />

        <Footer />
      </main>
    </>
  );
}
