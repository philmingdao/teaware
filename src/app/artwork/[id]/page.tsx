import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArtworkDetailView from '@/components/ArtworkDetailView';
import { artworks, getArtworkById } from '@/data/artworks';
import { artworkDescription, artworkTitle } from '@/lib/i18n';
import { FULL_URL, SITE_URL, BASE_PATH } from '@/lib/seo';

type PageProps = { params: Promise<{ id: string }> };

function artworkUrl(id: string) {
  return `${FULL_URL}/artwork/${encodeURIComponent(id)}/`;
}

function absoluteImageUrl(src: string) {
  if (/^https?:\/\//i.test(src)) return src;
  return `${SITE_URL}${BASE_PATH}${src.startsWith('/') ? src : `/${src}`}`;
}

export function generateStaticParams() {
  return artworks.map(({ id }) => ({ id }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const artwork = getArtworkById(id);
  if (!artwork) return { title: 'Artwork not found', robots: { index: false, follow: false } };

  const title = artworkTitle(artwork, 'zh');
  const description = artworkDescription(artwork, 'zh').slice(0, 157);
  const url = artworkUrl(artwork.id);
  const image = absoluteImageUrl(artwork.imageUrl);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: 'article', url, title, description, images: [{ url: image, alt: title }] },
    twitter: { card: 'summary_large_image', title, description, images: [{ url: image, alt: title }] },
    robots: { index: true, follow: true },
  };
}

export default async function ArtworkPage({ params }: PageProps) {
  const { id } = await params;
  const artwork = getArtworkById(id);
  if (!artwork) notFound();

  const currentIndex = artworks.findIndex((item) => item.id === artwork.id);
  const previousArtwork = currentIndex > 0 ? artworks[currentIndex - 1] : null;
  const nextArtwork = currentIndex >= 0 && currentIndex < artworks.length - 1 ? artworks[currentIndex + 1] : null;
  const title = artworkTitle(artwork, 'zh');
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: title,
    alternateName: artwork.titleEnglish || undefined,
    description: artworkDescription(artwork, 'zh').slice(0, 320),
    image: {
      '@type': 'ImageObject',
      contentUrl: absoluteImageUrl(artwork.imageUrl),
      caption: title,
    },
    url: artworkUrl(artwork.id),
    dateCreated: artwork.date,
    artMedium: artwork.materialEnglish || artwork.material,
    provider: { '@type': 'Organization', name: artwork.sourceMuseumEnglish || artwork.sourceMuseum },
    license: artwork.license,
    identifier: artwork.accessionNumber,
  };

  return (
    <>
      <ArtworkDetailView
        artwork={artwork}
        previousArtwork={previousArtwork}
        nextArtwork={nextArtwork}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    </>
  );
}
