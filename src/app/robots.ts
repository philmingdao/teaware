import { MetadataRoute } from 'next';
import { FULL_URL } from '@/lib/seo';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [],
      },
    ],
    sitemap: `${FULL_URL}/sitemap.xml`,
    host: FULL_URL,
  };
}
