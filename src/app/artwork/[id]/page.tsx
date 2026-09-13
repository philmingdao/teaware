import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { artworks, getArtworkById } from '@/data/artworks';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ResilientImage from '@/components/ResilientImage';
import ArtworkSlideshowButton from '@/components/ArtworkSlideshowButton';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return artworks.map((artwork) => ({
    id: artwork.id,
  }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const artwork = getArtworkById(id);
  
  if (!artwork) {
    return {
      title: '藏品未找到 | 器 · 茶',
    };
  }

  return {
    title: `${artwork.titleChinese} | 器 · 茶`,
    description: artwork.description,
    openGraph: {
      title: artwork.titleChinese,
      description: artwork.description,
      images: [artwork.imageUrl],
    },
  };
}

export default async function ArtworkPage({ params }: Props) {
  const { id } = await params;
  const artwork = getArtworkById(id);

  if (!artwork) {
    notFound();
  }

  const currentIndex = artworks.findIndex(a => a.id === id);
  const prevArtwork = currentIndex > 0 ? artworks[currentIndex - 1] : null;
  const nextArtwork = currentIndex < artworks.length - 1 ? artworks[currentIndex + 1] : null;

  return (
    <main className="flex-1 bg-[#faf9f7]">
      <Header />
      
      {/* Breadcrumb */}
      <div className="pt-24 pb-4 bg-[#f5f3ef]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <nav className="text-sm text-[#999]">
            <Link href="/" className="hover:text-[#1a1a1a] transition-colors">首页</Link>
            <span className="mx-2">/</span>
            <Link href="/gallery" className="hover:text-[#1a1a1a] transition-colors">藏品</Link>
            <span className="mx-2">/</span>
            <span className="text-[#1a1a1a]">{artwork.titleChinese}</span>
          </nav>
        </div>
      </div>

      {/* Artwork Detail */}
      <section className="py-12 lg:py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
            {/* Image */}
            <div className="relative">
              <div className="sticky top-32">
                <div className="relative aspect-square bg-[#ebe8e1] rounded-sm overflow-hidden shadow-xl">
                  <ResilientImage
                    src={artwork.imageUrl}
                    alt={artwork.imageAlt}
                    fill
                    className="p-4"
                    objectFit="contain"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    priority
                  />
                </div>
                
                {/* Image credit */}
                <p className="mt-4 text-xs text-[#999] text-center">
                  图片来源：{artwork.sourceMuseumEnglish}
                  <br />
                  <span className="text-[#b8956c]">{artwork.license}</span>
                </p>
              </div>
            </div>

            {/* Details */}
            <div>
              {/* Title */}
              <div className="mb-8">
                <span className="inline-block px-3 py-1 text-sm tracking-wider bg-[#1a1a1a] text-[#faf9f7] mb-4">
                  {artwork.dynasty}代
                </span>
                <h1 className="text-3xl md:text-4xl font-medium tracking-wider text-[#1a1a1a] leading-tight">
                  {artwork.titleChinese}
                </h1>
                <p className="mt-2 text-lg text-[#666] font-serif-en">
                  {artwork.titleEnglish}
                </p>
              </div>

              {/* Description - Wall Label Style */}
              <div className="bg-[#f5f3ef] p-6 lg:p-8 rounded-sm mb-8">
                <p className="text-[#3d3d3d] leading-relaxed">
                  {artwork.description}
                </p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <h3 className="text-xs tracking-widest text-[#999] uppercase mb-1">朝代 Dynasty</h3>
                  <p className="text-[#1a1a1a]">{artwork.dynastyEnglish}</p>
                </div>
                <div>
                  <h3 className="text-xs tracking-widest text-[#999] uppercase mb-1">年代 Date</h3>
                  <p className="text-[#1a1a1a]">{artwork.date}</p>
                </div>
                <div>
                  <h3 className="text-xs tracking-widest text-[#999] uppercase mb-1">材质 Material</h3>
                  <p className="text-[#1a1a1a]">{artwork.material}</p>
                  <p className="text-sm text-[#666] font-serif-en">{artwork.materialEnglish}</p>
                </div>
                <div>
                  <h3 className="text-xs tracking-widest text-[#999] uppercase mb-1">器型 Type</h3>
                  <p className="text-[#1a1a1a]">{artwork.objectType}</p>
                  <p className="text-sm text-[#666] font-serif-en">{artwork.objectTypeEnglish}</p>
                </div>
                {artwork.kiln && (
                  <div>
                    <h3 className="text-xs tracking-widest text-[#999] uppercase mb-1">窑口 Kiln</h3>
                    <p className="text-[#1a1a1a]">{artwork.kiln}</p>
                    <p className="text-sm text-[#666] font-serif-en">{artwork.kilnEnglish}</p>
                  </div>
                )}
                {artwork.dimensions && (
                  <div>
                    <h3 className="text-xs tracking-widest text-[#999] uppercase mb-1">尺寸 Dimensions</h3>
                    <p className="text-sm text-[#666]">{artwork.dimensions}</p>
                  </div>
                )}
              </div>

              <div className="divider-elegant !mx-0 !my-8"></div>

              {/* Museum Info */}
              <div className="mb-8">
                <h3 className="text-xs tracking-widest text-[#999] uppercase mb-3">收藏信息 Collection</h3>
                <div className="space-y-2">
                  <p className="text-[#1a1a1a]">{artwork.sourceMuseum}</p>
                  <p className="text-sm text-[#666] font-serif-en">{artwork.sourceMuseumEnglish}</p>
                  <p className="text-sm text-[#999]">馆藏编号: {artwork.accessionNumber}</p>
                  {artwork.creditLine && (
                    <p className="text-sm text-[#999]">{artwork.creditLine}</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <ArtworkSlideshowButton 
                  allArtworks={artworks} 
                  currentIndex={currentIndex} 
                />
                <a
                  href={artwork.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-elegant inline-flex items-center gap-2"
                >
                  在博物馆官网查看
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Navigation */}
      <section className="py-12 bg-[#f5f3ef] border-t border-[#ebe8e1]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex justify-between items-center">
            {prevArtwork ? (
              <Link 
                href={`/artwork/${prevArtwork.id}`}
                className="group flex items-center gap-3 text-[#666] hover:text-[#1a1a1a] transition-colors"
              >
                <svg className="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                </svg>
                <div className="text-left">
                  <span className="block text-xs text-[#999]">上一件</span>
                  <span className="block text-sm">{prevArtwork.titleChinese}</span>
                </div>
              </Link>
            ) : (
              <div></div>
            )}

            <Link 
              href="/gallery"
              className="text-sm text-[#b8956c] hover:text-[#1a1a1a] transition-colors"
            >
              返回藏品列表
            </Link>

            {nextArtwork ? (
              <Link 
                href={`/artwork/${nextArtwork.id}`}
                className="group flex items-center gap-3 text-[#666] hover:text-[#1a1a1a] transition-colors"
              >
                <div className="text-right">
                  <span className="block text-xs text-[#999]">下一件</span>
                  <span className="block text-sm">{nextArtwork.titleChinese}</span>
                </div>
                <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <div></div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
