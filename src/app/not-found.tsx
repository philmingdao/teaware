'use client';

import { useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function NotFound() {
  const router = useRouter();
  const pathname = usePathname();
  
  const artworkId = useMemo(() => {
    const artworkMatch = pathname?.match(/^\/artwork\/([^\/]+)\/?$/);
    return artworkMatch ? artworkMatch[1] : null;
  }, [pathname]);

  useEffect(() => {
    if (artworkId) {
      router.replace(`/artwork?id=${encodeURIComponent(artworkId)}`);
    }
  }, [artworkId, router]);

  if (artworkId) {
    return (
      <main className="flex-1 bg-[#faf9f7] dark:bg-[#0f0f0e]">
        <Header />
        <div className="pt-24 pb-12 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 border-2 border-[#b8956c] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#666] dark:text-[#9a9894]">正在加载藏品...</p>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  return (
    <main className="flex-1 bg-[#faf9f7] dark:bg-[#0f0f0e]">
      <Header />
      <div className="pt-24 pb-12 min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <h1 className="text-6xl font-medium text-[#b8956c] dark:text-[#d4b896] mb-4">404</h1>
          <h2 className="text-2xl font-medium text-[#1a1a1a] dark:text-[#e8e6e3] mb-4">
            页面未找到
          </h2>
          <p className="text-[#666] dark:text-[#9a9894] mb-8">
            您访问的页面不存在或已被移除。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/" 
              className="btn-elegant inline-flex items-center justify-center gap-2"
            >
              返回首页
            </Link>
            <Link 
              href="/gallery" 
              className="btn-elegant inline-flex items-center justify-center gap-2"
            >
              浏览藏品
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
