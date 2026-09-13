import { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import GalleryGrid from '@/components/GalleryGrid';

export const metadata: Metadata = {
  title: '藏品浏览 | 器 · 茶',
  description: '浏览中国茶具艺术展全部藏品，按朝代、材质、器型分类筛选',
};

export default function GalleryPage() {
  return (
    <main className="flex-1">
      <Header />
      
      {/* Page Header */}
      <section className="pt-32 pb-12 bg-gradient-to-b from-[#f5f3ef] to-[#faf9f7] dark:from-[#171614] dark:to-[#0f0f0e]">
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
        </div>
      </section>

      <GalleryGrid />
      <Footer />
    </main>
  );
}
