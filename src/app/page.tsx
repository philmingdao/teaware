import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Hero from '@/components/Hero';
import GalleryPreview from '@/components/GalleryPreview';

export default function Home() {
  return (
    <main className="flex-1">
      <Header />
      <Hero />
      <GalleryPreview />
      <Footer />
    </main>
  );
}
