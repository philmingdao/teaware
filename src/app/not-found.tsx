'use client';

import { useLanguage } from '@/components/LanguageProvider';
import { useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from '@/components/LocaleLink';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function NotFound() {
  const { t, href } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  
  const artworkId = useMemo(() => {
    const artworkMatch = pathname?.match(/^\/artwork\/([^\/]+)\/?$/);
    return artworkMatch ? artworkMatch[1] : null;
  }, [pathname]);

  useEffect(() => {
    if (artworkId) {
      router.replace(href('/gallery/'));
    }
  }, [artworkId, router, href]);

  if (artworkId) {
    return (
      <main className="flex-1 bg-[#faf9f7] dark:bg-[#0f0f0e]">
        <Header />
        <div className="pt-24 pb-12 min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 border-2 border-[#b8956c] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#666] dark:text-[#9a9894]">{t('loading')}</p>
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
            {t('pageNotFound')}
          </h2>
          <p className="text-[#666] dark:text-[#9a9894] mb-8">
            {t('pageRemoved')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/" 
              className="btn-elegant inline-flex items-center justify-center gap-2"
            >
              {t('backHome')}
            </Link>
            <Link 
              href="/gallery" 
              className="btn-elegant inline-flex items-center justify-center gap-2"
            >
              {t('gallery')}
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
