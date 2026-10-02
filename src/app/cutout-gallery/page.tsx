import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CutoutGallery from '@/components/CutoutGallery';
import samples from '@/data/cutout-samples.json';

export const metadata: Metadata = {
  title: '器物近观 · 透明底试展',
  description: '20件茶器的透明背景试展。对照馆藏原图，近看器形、釉色与纹样。',
  robots: { index: false, follow: true },
};

export default function CutoutGalleryPage() {
  return (
    <main className="flex-1">
      <Header />
      <CutoutGallery samples={samples} />
      <Footer />
    </main>
  );
}
