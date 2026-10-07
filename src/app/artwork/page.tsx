import type { Metadata } from 'next';
import ArtworkQueryRedirect from '@/components/ArtworkQueryRedirect';
import { FULL_URL } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Opening artwork | 器 · 茶',
  robots: { index: false, follow: true },
  alternates: { canonical: `${FULL_URL}/artwork/` },
};

export default function ArtworkQueryPage() {
  return <ArtworkQueryRedirect />;
}
