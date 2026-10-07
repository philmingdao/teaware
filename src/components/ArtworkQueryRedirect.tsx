'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

function ArtworkQueryRedirectContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const id = searchParams.get('id');
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    const destination = id
      ? `${basePath}/artwork/${encodeURIComponent(id)}/`
      : `${basePath}/gallery/`;
    const url = new URL(destination, window.location.origin);
    const language = searchParams.get('lang');
    if (language) url.searchParams.set('lang', language);
    window.location.replace(url.toString());
  }, [searchParams]);

  return <main><p>Opening artwork…</p></main>;
}

export default function ArtworkQueryRedirect() {
  return <Suspense fallback={<main><p>Opening artwork…</p></main>}><ArtworkQueryRedirectContent /></Suspense>;
}
