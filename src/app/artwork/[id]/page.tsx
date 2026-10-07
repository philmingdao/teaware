import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from '@/components/LocaleLink';
import { artworks, getArtworkById } from '@/data/artworks';
import { artworkDescription, artworkTitle } from '@/lib/i18n';
import { BASE_PATH, FULL_URL, SITE_URL } from '@/lib/seo';
import { withBasePath } from '@/lib/paths';

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
    openGraph: {
      type: 'article',
      url,
      title,
      description,
      images: [{ url: image, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [{ url: image, alt: title }],
    },
    robots: { index: true, follow: true },
  };
}

export default async function ArtworkPage({ params }: PageProps) {
  const { id } = await params;
  const artwork = getArtworkById(id);
  if (!artwork) notFound();

  const title = artworkTitle(artwork, 'zh');
  const description = artworkDescription(artwork, 'zh').slice(0, 320);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: title,
    alternateName: artwork.titleEnglish || undefined,
    description,
    image: {
      '@type': 'ImageObject',
      contentUrl: absoluteImageUrl(artwork.imageUrl),
      caption: title,
    },
    url: artworkUrl(artwork.id),
    dateCreated: artwork.date,
    artMedium: artwork.materialEnglish || artwork.material,
    provider: {
      '@type': 'Organization',
      name: artwork.sourceMuseumEnglish || artwork.sourceMuseum,
    },
    license: artwork.license,
    identifier: artwork.accessionNumber,
  };

  return (
    <main className="collection-surface flex-1">
      <div className="pt-24 pb-4">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <nav aria-label="Breadcrumb" className="text-sm">
            <Link href="/">首页</Link><span className="mx-2">/</span>
            <Link href="/gallery/">藏品</Link><span className="mx-2">/</span>
            <span aria-current="page">{title}</span>
          </nav>
        </div>
      </div>
      <article className="py-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          <figure>
            <img
              src={withBasePath(artwork.imageUrl)}
              alt={title}
              className="w-full max-h-[75vh] object-contain"
              fetchPriority="high"
            />
            <figcaption>
              {artwork.sourceMuseumEnglish || artwork.sourceMuseum} · {artwork.license}
            </figcaption>
          </figure>
          <div>
            <p>{artwork.dynastyEnglish || artwork.dynasty} · {artwork.date}</p>
            <h1>{title}</h1>
            {artwork.titleEnglish && <p>{artwork.titleEnglish}</p>}
            <p>{description}</p>
            <dl>
              <div><dt>Material</dt><dd>{artwork.material} · {artwork.materialEnglish}</dd></div>
              <div><dt>Museum</dt><dd>{artwork.sourceMuseum} · {artwork.sourceMuseumEnglish}</dd></div>
              <div><dt>Accession number</dt><dd>{artwork.accessionNumber}</dd></div>
            </dl>
            <a href={artwork.sourceUrl} target="_blank" rel="noopener noreferrer">在博物馆官网查看 · View at museum</a>
          </div>
        </div>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
    </main>
  );
}
