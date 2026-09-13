import { Metadata } from 'next';
import { Suspense } from 'react';
import TVMode from '@/components/TVMode';

export const metadata: Metadata = {
  title: '全屏展览 | 器 · 茶',
  description: '电视/大屏全屏展览模式 - 沉浸式茶器艺术浏览',
};

function TVLoading() {
  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
    </div>
  );
}

export default function TVPage() {
  return (
    <Suspense fallback={<TVLoading />}>
      <TVMode />
    </Suspense>
  );
}
